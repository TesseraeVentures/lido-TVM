import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano, Address } from '@ton/core';
import '@ton/test-utils';

import { StakingVault } from '../build/staking_vault/staking_vault_StakingVault';
import { UpgradeController } from '../build/upgrade_controller/upgrade_controller_UpgradeController';
import { WithdrawalAdapterStub } from '../build/withdrawal_adapter_stub/withdrawal_adapter_stub_WithdrawalAdapterStub';

describe('StakingVault migration suite', () => {
  let blockchain: Blockchain;
  let owner: SandboxContract<TreasuryContract>;
  let depositor: SandboxContract<TreasuryContract>;
  let nodeOperator: SandboxContract<TreasuryContract>;
  let recipient: SandboxContract<TreasuryContract>;
  let governance: SandboxContract<TreasuryContract>;
  let randomUser: SandboxContract<TreasuryContract>;

  let adapter: SandboxContract<WithdrawalAdapterStub>;
  let controller: SandboxContract<UpgradeController>;
  let vault: SandboxContract<StakingVault>;

  beforeEach(async () => {
    blockchain = await Blockchain.create();
    owner = await blockchain.treasury('owner');
    depositor = await blockchain.treasury('depositor');
    nodeOperator = await blockchain.treasury('nodeOperator');
    recipient = await blockchain.treasury('recipient');
    governance = await blockchain.treasury('governance');
    randomUser = await blockchain.treasury('random');

    adapter = blockchain.openContract(await WithdrawalAdapterStub.fromInit());
    await adapter.send(owner.getSender(), { value: toNano('0.05') }, { $$type: 'Deploy', queryId: 1n });

    controller = blockchain.openContract(await UpgradeController.fromInit(governance.address));
    await controller.send(governance.getSender(), { value: toNano('0.05') }, { $$type: 'Deploy', queryId: 1n });

    vault = blockchain.openContract(await StakingVault.fromInit(
      owner.address,
      nodeOperator.address,
      depositor.address,
      controller.address,
      adapter.address,
    ));

    await vault.send(owner.getSender(), { value: toNano('0.2') }, { $$type: 'Deploy', queryId: 1n });
  });

  it('owner fund/withdraw happy path', async () => {
    const funded = await vault.send(owner.getSender(), { value: toNano('0.3') }, { $$type: 'Fund', queryId: 11n });
    expect(funded.transactions).toHaveTransaction({ success: true });

    const before = await recipient.getBalance();
    await vault.send(owner.getSender(), { value: toNano('0.05') }, { $$type: 'Withdraw', queryId: 12n, recipient: recipient.address, amount: toNano('0.1') });
    const after = await recipient.getBalance();
    expect(after > before).toBe(true);
  });

  it('access control on owner-only messages', async () => {
    const res = await vault.send(randomUser.getSender(), { value: toNano('0.05') }, { $$type: 'PauseBeaconDeposits', queryId: 13n });
    expect(res.transactions).toHaveTransaction({ success: false });
  });

  it('depositor-only deposit to beacon + pause/resume gating', async () => {
    const ok = await vault.send(depositor.getSender(), { value: toNano('0.05') }, {
      $$type: 'DepositToBeacon',
      queryId: 14n,
      validatorsCount: 2n,
      totalAmount: toNano('0.05'),
    });
    expect(ok.transactions).toHaveTransaction({ success: true });

    await vault.send(owner.getSender(), { value: toNano('0.05') }, { $$type: 'PauseBeaconDeposits', queryId: 15n });
    const paused = await vault.getGetPaused();
    expect(paused).toBe(true);

    const blocked = await vault.send(depositor.getSender(), { value: toNano('0.05') }, {
      $$type: 'DepositToBeacon',
      queryId: 16n,
      validatorsCount: 1n,
      totalAmount: toNano('0.01'),
    });
    expect(blocked.transactions).toHaveTransaction({ success: false });

    await vault.send(owner.getSender(), { value: toNano('0.05') }, { $$type: 'ResumeBeaconDeposits', queryId: 17n });
    expect(await vault.getGetPaused()).toBe(false);
  });

  it('trigger withdrawal sends to adapter and refunds excess', async () => {
    await vault.send(owner.getSender(), { value: toNano('0.05') }, { $$type: 'SetFee', queryId: 18n, perValidatorFee: toNano('0.01') });

    const before = await recipient.getBalance();
    const tx = await vault.send(owner.getSender(), { value: toNano('0.05') }, {
      $$type: 'TriggerValidatorWithdrawal',
      queryId: 19n,
      validatorsCount: 3n,
      refundRecipient: recipient.address,
    });
    expect(tx.transactions).toHaveTransaction({ from: vault.address, to: adapter.address, success: true });

    const q = await adapter.getGetLastQueryId();
    expect(q).toBe(19n);

    const after = await recipient.getBalance();
    expect(after > before).toBe(true);
  });

  it('bounce path refunds pending fee when adapter message bounces', async () => {
    const badAdapter = Address.parseRaw('0:' + '11'.repeat(32));
    const badVault = blockchain.openContract(await StakingVault.fromInit(
      owner.address,
      nodeOperator.address,
      depositor.address,
      controller.address,
      badAdapter,
    ));
    await badVault.send(owner.getSender(), { value: toNano('0.2') }, { $$type: 'Deploy', queryId: 1n });
    await badVault.send(owner.getSender(), { value: toNano('0.05') }, { $$type: 'SetFee', queryId: 20n, perValidatorFee: toNano('0.02') });

    const before = await recipient.getBalance();
    const tx = await badVault.send(owner.getSender(), { value: toNano('0.05') }, {
      $$type: 'TriggerValidatorWithdrawal',
      queryId: 21n,
      validatorsCount: 2n,
      refundRecipient: recipient.address,
    });

    expect(tx.transactions).toHaveTransaction({ from: badVault.address, to: badAdapter, success: false, aborted: true });

    const pending = await badVault.getGetPendingFee();
    expect(pending).toBe(0n);
    const after = await recipient.getBalance();
    expect(after > before).toBe(true);
  });

  it('upgrade gating + ossify blocks further authorizations', async () => {
    const unauthorized = await vault.send(randomUser.getSender(), { value: toNano('0.05') }, {
      $$type: 'AuthorizeUpgrade',
      queryId: 22n,
      codeHash: 777n,
    });
    expect(unauthorized.transactions).toHaveTransaction({ success: false });

    await controller.send(governance.getSender(), { value: toNano('0.05') }, {
      $$type: 'ProposeUpgrade',
      queryId: 23n,
      vault: vault.address,
      codeHash: 999n,
    });
    expect(await vault.getGetActiveCodeHash()).toBe(999n);

    await vault.send(owner.getSender(), { value: toNano('0.05') }, 'ossify');
    expect(await vault.getGetOssified()).toBe(true);

    const blocked = await controller.send(governance.getSender(), { value: toNano('0.05') }, {
      $$type: 'ProposeUpgrade',
      queryId: 24n,
      vault: vault.address,
      codeHash: 1000n,
    });
    expect(blocked.transactions).toHaveTransaction({ success: false });
  });
});
