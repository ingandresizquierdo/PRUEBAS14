import { Component, QWeb, useState } from "owl";

class Counter extends Component {
  state = useState({ value: 0 });

  increment() {
    this.state.value++;
  }
}

const counter = new Counter();
counter.mount(document.body);