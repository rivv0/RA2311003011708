const axios = require('axios');
const { getToken } = require('logging_middleware/auth');
const { BASE_URL } = require('logging_middleware/config');

const weightMap = {
  "Placement": 3,
  "Result": 2,
  "Event": 1
};

class MinHeap {
  constructor(capacity) {
    this.heap = [];
    this.capacity = capacity;
  }
  
  compare(a, b) {
    const weightA = weightMap[a.Type] || 0;
    const weightB = weightMap[b.Type] || 0;
    if (weightA !== weightB) return weightA - weightB; // Smaller weight goes to root
    return new Date(a.Timestamp).getTime() - new Date(b.Timestamp).getTime(); // Older time goes to root
  }

  push(val) {
    if (this.heap.length < this.capacity) {
      this.heap.push(val);
      this._bubbleUp(this.heap.length - 1);
    } else if (this.compare(val, this.heap[0]) > 0) {
      // If new item is MORE important than the root (the least important in top 10), replace root
      this.heap[0] = val;
      this._sinkDown(0);
    }
  }

  _bubbleUp(idx) {
    while (idx > 0) {
      let parent = Math.floor((idx - 1) / 2);
      if (this.compare(this.heap[idx], this.heap[parent]) >= 0) break;
      [this.heap[idx], this.heap[parent]] = [this.heap[parent], this.heap[idx]];
      idx = parent;
    }
  }

  _sinkDown(idx) {
    let length = this.heap.length;
    while (true) {
      let left = 2 * idx + 1;
      let right = 2 * idx + 2;
      let smallest = idx;

      if (left < length && this.compare(this.heap[left], this.heap[smallest]) < 0) {
        smallest = left;
      }
      if (right < length && this.compare(this.heap[right], this.heap[smallest]) < 0) {
        smallest = right;
      }
      if (smallest === idx) break;
      [this.heap[idx], this.heap[smallest]] = [this.heap[smallest], this.heap[idx]];
      idx = smallest;
    }
  }
}

async function runPriorityInbox() {
  try {
    const token = await getToken();
    if (!token) throw new Error("Failed to get auth token");

    const res = await axios.get(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    let notifications = res.data.notifications || res.data;

    // Using our custom Min-Heap to maintain ONLY the top 10 items in O(N log 10) time
    const top10Heap = new MinHeap(10);
    for (const n of notifications) {
      top10Heap.push(n);
    }

    // Extract the top 10 and sort them descending for display
    const top10 = top10Heap.heap.sort((a, b) => top10Heap.compare(b, a));

    console.log("=== TOP 10 PRIORITY INBOX (Via Min-Heap) ===");
    top10.forEach((n, idx) => {
      console.log(`${idx + 1}. [${n.Type}] ${n.Message} (Time: ${n.Timestamp})`);
    });

  } catch (err) {
    console.error("Priority Inbox failed:", err.message);
  }
}

runPriorityInbox();
