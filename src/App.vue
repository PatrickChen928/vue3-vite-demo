<template>
  <div>
    <h1>{{name}}剩余的网费是 <span style="color: red;">{{count}}</span> 元</h1>
    <button @click="addMoney">网管，加钱</button>
  </div>
</template>

<script>

export default {
  name: 'App',
  data() {
    return {
      name: 'Jack',
      count: 100
    }
  },
  methods: {
    addMoney() {
      this.count++;
    }
  }
}
</script>
