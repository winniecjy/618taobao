/**
 * 2020618 淘宝互动 - 理想列车
 * 游戏规则：
 * 共10个合成位置可以放置车厢，车厢有58个等级状态，
 * 车厢通过金币生成，等级越高，所需要的金币越大，永远生成当前最高车厢等级-1的车厢
 * 同一等级车厢可以合并，如等级1+等级1=等级2
 * 列车等级达到20级，即可最终瓜分大奖
 * action假设：
 * 购买车厢：等级1车厢需要金币10，等级n车厢需要金币 gold(n) = gold(1)*1.8^(n-1)
 * 做任务：做任务可以获得金币500
 * 
 * author: cai jieying
 */
const fs = require("fs")
const TIMES = 1000 // 尝试次数
const ALPHA = 0.1 // 学习率
const GAMMA = 0.9 // 衰减率
var EPSILON = 0.9 // greedy贪婪程度

var rand = function(){
  var today = new Date();
  var seed = today.getTime();
  function rnd(){
    seed = ( seed * 9301 + 49297 ) % 233280;
    return seed / ( 233280.0 );
  };
  return rnd(seed)
}

class QLearning {
  constructor() {
    // 初始化状态
    this.state = {
      level: 1, // 等级 == 拥有车厢中的最高级别
      cars: [],
      gold: 0,
    }
    // 初始化q值表
    this.qTable = {}
    this.actionList = ['buy', 'merge', 'task']
  }

  /**
   * 开始训练
   */
  start() {
    var cnt = 0
    this.qTable = {}
    while (cnt++ < TIMES) {
      EPSILON = cnt/TIMES
      this.state = {
        level: 1, // 等级 == 拥有车厢中的最高级别
        cars: [],
        gold: 0,
      }
      var step = 0, actionChain = []
      while(this.state.level < 20) {
        step++
        var action = this.chooseAction() // 选择action
        while(action==='') action = this.chooseAction()
        var oldStateName = this.getStateName()
        var qPredict = this.qTable[oldStateName]?this.qTable[oldStateName][action]:0
        var reward = this.strategy(action) // 执行action并反馈到环境，获得reward
        var qTarget, newStateName = this.getStateName()
        if (this.state.level < 20) {
          let { max } = this.getStateMax(newStateName)
          qTarget = reward + GAMMA*max
        } else {
          qTarget = reward
        }
        if (!this.qTable[oldStateName]) {
          this.qTable[oldStateName] = {}
          this.qTable[oldStateName][action] = 0
        }
        this.qTable[oldStateName][action] += ALPHA*(qTarget - qPredict)
        actionChain.push(action)

      console.log("level: ", this.state)
      }
      // console.log("step: ", step)
      let data = {
        step: step,
        qTable: JSON.stringify(this.qTable),
        actionChain,
        state: this.state
      }
      fs.writeFileSync(`${__dirname}/learningData/qTable${cnt}.txt`, JSON.stringify(data))
    }
  }

  /**
   * 选择动作名称
   */
  chooseAction() {
    const stateName = this.getStateName()
    if (rand()>EPSILON || !this.qTable.hasOwnProperty(stateName)) { // 非贪婪或状态未探索过
      var randomIdx = Math.floor(rand()*3)
      return this.actionList[randomIdx]
    } else { // 贪婪，获取q值最大的
      let { choose } = this.getStateMax(stateName)
      return choose
    }
  }

  /**
   * 选取当前状态历史最大的q值
   */
  getStateMax(stateName) {
    let max = 0, choose = ''
    if (this.qTable.hasOwnProperty(stateName)) {
      for(let action of this.actionList) {
        if (this.qTable[stateName][action] && this.qTable[stateName][action] > max) {
          max = this.qTable[stateName][action]
          choose = action
        }
      }
    }
    return {max, choose}
  }

  /**
   * 获取当前state名称
   */
  getStateName() {
    this.state.cars.sort((a,b) => a-b)
    return `level${this.state.level}_cars${this.state.cars.join(',')}`
  }
  /**
   * 动作策略
   * @returns {number} r奖励值 
   */
  strategy(action) {
    const buy = () => {
      var carPrice = Math.pow(1.8, this.state.level-1) * 10
      if (this.state.gold >= carPrice && this.state.cars.length<8) { // 钱包鼓鼓且有地放
        // 放进去如果死锁，就放弃购买
        this.state.cars.sort((a,b) => a-b)
        if (this.state.cars.length == 7) {
          for(let i=1; i<this.state.cars.length; i++) {
            if (this.state.cars[i] === this.state.cars[i-1]) {
              break;
            } else if (i==6 && this.state.level-1 !== this.state.cars[i]) {
              return 0
            }
          }
        }
        
        this.state.gold -= carPrice
        this.state.cars.push(this.state.level-1 || 1)
      }
      return 0
    }
    const merge = () => {
      this.state.cars.sort((a,b) => a-b)
      for(let i=1; i<this.state.cars.length; i++) {
        if (this.state.cars[i] == this.state.cars[i-1]) {
          var newLevel = this.state.cars[i]+1
          this.state.cars.splice(i-1,2,newLevel)
          if (newLevel>this.state.level) {
            this.state.level = newLevel
            return 2
          }
        }
      }
      return 1
    }
    const task = () => {
      this.state.gold += 500
      return 0
    }
    var strategies = {
      buy,
      merge,
      task,
    }
    return strategies[action]()
  }
}


var qLearning = new QLearning()
qLearning.start()