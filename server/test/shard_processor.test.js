const { ShardDispatcher } = require('../src/message_queue/shard_processor');
const { expect } = require('chai');
const sinon = require('sinon');

describe('消息分片处理器测试', () => {
  let dispatcher;
  let flushStub;

  beforeEach(() => {
    dispatcher = new ShardDispatcher();
    flushStub = sinon.stub(dispatcher, 'flush_shard');
  });

  afterEach(() => {
    flushStub.restore();
  });

  it('应根据group_id哈希分配到不同分片', async () => {
    const msg1 = { group_id: 1001, content: '测试消息1' };
    const msg2 = { group_id: 6001, content: '测试消息2' };

    await dispatcher.dispatch_message(msg1, msg1.group_id);
    await dispatcher.dispatch_message(msg2, msg2.group_id);

    // 5000人一组的分片策略，1001%20=1，6001%20=1
    expect(dispatcher.shard_buffers[1]).to.have.lengthOf(2);
  });

  it('积累50条消息应触发自动刷新', async () => {
    const testGroupId = 1001;
    // 连续发送50条消息
    for (let i = 0; i < 50; i++) {
      await dispatcher.dispatch_message({ id: i }, testGroupId);
    }

    expect(flushStub.calledOnce).to.be.true;
    expect(flushStub.calledWith(testGroupId % 20)).to.be.true;
  });
});