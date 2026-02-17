import {
    Cell,
    Slice,
    Address,
    Builder,
    beginCell,
    ComputeError,
    TupleItem,
    TupleReader,
    Dictionary,
    contractAddress,
    address,
    ContractProvider,
    Sender,
    Contract,
    ContractABI,
    ABIType,
    ABIGetter,
    ABIReceiver,
    TupleBuilder,
    DictionaryValue
} from '@ton/core';

export type DataSize = {
    $$type: 'DataSize';
    cells: bigint;
    bits: bigint;
    refs: bigint;
}

export function storeDataSize(src: DataSize) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.cells, 257);
        b_0.storeInt(src.bits, 257);
        b_0.storeInt(src.refs, 257);
    };
}

export function loadDataSize(slice: Slice) {
    const sc_0 = slice;
    const _cells = sc_0.loadIntBig(257);
    const _bits = sc_0.loadIntBig(257);
    const _refs = sc_0.loadIntBig(257);
    return { $$type: 'DataSize' as const, cells: _cells, bits: _bits, refs: _refs };
}

export function loadTupleDataSize(source: TupleReader) {
    const _cells = source.readBigNumber();
    const _bits = source.readBigNumber();
    const _refs = source.readBigNumber();
    return { $$type: 'DataSize' as const, cells: _cells, bits: _bits, refs: _refs };
}

export function loadGetterTupleDataSize(source: TupleReader) {
    const _cells = source.readBigNumber();
    const _bits = source.readBigNumber();
    const _refs = source.readBigNumber();
    return { $$type: 'DataSize' as const, cells: _cells, bits: _bits, refs: _refs };
}

export function storeTupleDataSize(source: DataSize) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.cells);
    builder.writeNumber(source.bits);
    builder.writeNumber(source.refs);
    return builder.build();
}

export function dictValueParserDataSize(): DictionaryValue<DataSize> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDataSize(src)).endCell());
        },
        parse: (src) => {
            return loadDataSize(src.loadRef().beginParse());
        }
    }
}

export type SignedBundle = {
    $$type: 'SignedBundle';
    signature: Buffer;
    signedData: Slice;
}

export function storeSignedBundle(src: SignedBundle) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeBuffer(src.signature);
        b_0.storeBuilder(src.signedData.asBuilder());
    };
}

export function loadSignedBundle(slice: Slice) {
    const sc_0 = slice;
    const _signature = sc_0.loadBuffer(64);
    const _signedData = sc_0;
    return { $$type: 'SignedBundle' as const, signature: _signature, signedData: _signedData };
}

export function loadTupleSignedBundle(source: TupleReader) {
    const _signature = source.readBuffer();
    const _signedData = source.readCell().asSlice();
    return { $$type: 'SignedBundle' as const, signature: _signature, signedData: _signedData };
}

export function loadGetterTupleSignedBundle(source: TupleReader) {
    const _signature = source.readBuffer();
    const _signedData = source.readCell().asSlice();
    return { $$type: 'SignedBundle' as const, signature: _signature, signedData: _signedData };
}

export function storeTupleSignedBundle(source: SignedBundle) {
    const builder = new TupleBuilder();
    builder.writeBuffer(source.signature);
    builder.writeSlice(source.signedData.asCell());
    return builder.build();
}

export function dictValueParserSignedBundle(): DictionaryValue<SignedBundle> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeSignedBundle(src)).endCell());
        },
        parse: (src) => {
            return loadSignedBundle(src.loadRef().beginParse());
        }
    }
}

export type StateInit = {
    $$type: 'StateInit';
    code: Cell;
    data: Cell;
}

export function storeStateInit(src: StateInit) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeRef(src.code);
        b_0.storeRef(src.data);
    };
}

export function loadStateInit(slice: Slice) {
    const sc_0 = slice;
    const _code = sc_0.loadRef();
    const _data = sc_0.loadRef();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

export function loadTupleStateInit(source: TupleReader) {
    const _code = source.readCell();
    const _data = source.readCell();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

export function loadGetterTupleStateInit(source: TupleReader) {
    const _code = source.readCell();
    const _data = source.readCell();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

export function storeTupleStateInit(source: StateInit) {
    const builder = new TupleBuilder();
    builder.writeCell(source.code);
    builder.writeCell(source.data);
    return builder.build();
}

export function dictValueParserStateInit(): DictionaryValue<StateInit> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeStateInit(src)).endCell());
        },
        parse: (src) => {
            return loadStateInit(src.loadRef().beginParse());
        }
    }
}

export type Context = {
    $$type: 'Context';
    bounceable: boolean;
    sender: Address;
    value: bigint;
    raw: Slice;
}

export function storeContext(src: Context) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeBit(src.bounceable);
        b_0.storeAddress(src.sender);
        b_0.storeInt(src.value, 257);
        b_0.storeRef(src.raw.asCell());
    };
}

export function loadContext(slice: Slice) {
    const sc_0 = slice;
    const _bounceable = sc_0.loadBit();
    const _sender = sc_0.loadAddress();
    const _value = sc_0.loadIntBig(257);
    const _raw = sc_0.loadRef().asSlice();
    return { $$type: 'Context' as const, bounceable: _bounceable, sender: _sender, value: _value, raw: _raw };
}

export function loadTupleContext(source: TupleReader) {
    const _bounceable = source.readBoolean();
    const _sender = source.readAddress();
    const _value = source.readBigNumber();
    const _raw = source.readCell().asSlice();
    return { $$type: 'Context' as const, bounceable: _bounceable, sender: _sender, value: _value, raw: _raw };
}

export function loadGetterTupleContext(source: TupleReader) {
    const _bounceable = source.readBoolean();
    const _sender = source.readAddress();
    const _value = source.readBigNumber();
    const _raw = source.readCell().asSlice();
    return { $$type: 'Context' as const, bounceable: _bounceable, sender: _sender, value: _value, raw: _raw };
}

export function storeTupleContext(source: Context) {
    const builder = new TupleBuilder();
    builder.writeBoolean(source.bounceable);
    builder.writeAddress(source.sender);
    builder.writeNumber(source.value);
    builder.writeSlice(source.raw.asCell());
    return builder.build();
}

export function dictValueParserContext(): DictionaryValue<Context> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeContext(src)).endCell());
        },
        parse: (src) => {
            return loadContext(src.loadRef().beginParse());
        }
    }
}

export type SendParameters = {
    $$type: 'SendParameters';
    mode: bigint;
    body: Cell | null;
    code: Cell | null;
    data: Cell | null;
    value: bigint;
    to: Address;
    bounce: boolean;
}

export function storeSendParameters(src: SendParameters) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.mode, 257);
        if (src.body !== null && src.body !== undefined) { b_0.storeBit(true).storeRef(src.body); } else { b_0.storeBit(false); }
        if (src.code !== null && src.code !== undefined) { b_0.storeBit(true).storeRef(src.code); } else { b_0.storeBit(false); }
        if (src.data !== null && src.data !== undefined) { b_0.storeBit(true).storeRef(src.data); } else { b_0.storeBit(false); }
        b_0.storeInt(src.value, 257);
        b_0.storeAddress(src.to);
        b_0.storeBit(src.bounce);
    };
}

export function loadSendParameters(slice: Slice) {
    const sc_0 = slice;
    const _mode = sc_0.loadIntBig(257);
    const _body = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _code = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _data = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _value = sc_0.loadIntBig(257);
    const _to = sc_0.loadAddress();
    const _bounce = sc_0.loadBit();
    return { $$type: 'SendParameters' as const, mode: _mode, body: _body, code: _code, data: _data, value: _value, to: _to, bounce: _bounce };
}

export function loadTupleSendParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _code = source.readCellOpt();
    const _data = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'SendParameters' as const, mode: _mode, body: _body, code: _code, data: _data, value: _value, to: _to, bounce: _bounce };
}

export function loadGetterTupleSendParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _code = source.readCellOpt();
    const _data = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'SendParameters' as const, mode: _mode, body: _body, code: _code, data: _data, value: _value, to: _to, bounce: _bounce };
}

export function storeTupleSendParameters(source: SendParameters) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.mode);
    builder.writeCell(source.body);
    builder.writeCell(source.code);
    builder.writeCell(source.data);
    builder.writeNumber(source.value);
    builder.writeAddress(source.to);
    builder.writeBoolean(source.bounce);
    return builder.build();
}

export function dictValueParserSendParameters(): DictionaryValue<SendParameters> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeSendParameters(src)).endCell());
        },
        parse: (src) => {
            return loadSendParameters(src.loadRef().beginParse());
        }
    }
}

export type MessageParameters = {
    $$type: 'MessageParameters';
    mode: bigint;
    body: Cell | null;
    value: bigint;
    to: Address;
    bounce: boolean;
}

export function storeMessageParameters(src: MessageParameters) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.mode, 257);
        if (src.body !== null && src.body !== undefined) { b_0.storeBit(true).storeRef(src.body); } else { b_0.storeBit(false); }
        b_0.storeInt(src.value, 257);
        b_0.storeAddress(src.to);
        b_0.storeBit(src.bounce);
    };
}

export function loadMessageParameters(slice: Slice) {
    const sc_0 = slice;
    const _mode = sc_0.loadIntBig(257);
    const _body = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _value = sc_0.loadIntBig(257);
    const _to = sc_0.loadAddress();
    const _bounce = sc_0.loadBit();
    return { $$type: 'MessageParameters' as const, mode: _mode, body: _body, value: _value, to: _to, bounce: _bounce };
}

export function loadTupleMessageParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'MessageParameters' as const, mode: _mode, body: _body, value: _value, to: _to, bounce: _bounce };
}

export function loadGetterTupleMessageParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'MessageParameters' as const, mode: _mode, body: _body, value: _value, to: _to, bounce: _bounce };
}

export function storeTupleMessageParameters(source: MessageParameters) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.mode);
    builder.writeCell(source.body);
    builder.writeNumber(source.value);
    builder.writeAddress(source.to);
    builder.writeBoolean(source.bounce);
    return builder.build();
}

export function dictValueParserMessageParameters(): DictionaryValue<MessageParameters> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeMessageParameters(src)).endCell());
        },
        parse: (src) => {
            return loadMessageParameters(src.loadRef().beginParse());
        }
    }
}

export type DeployParameters = {
    $$type: 'DeployParameters';
    mode: bigint;
    body: Cell | null;
    value: bigint;
    bounce: boolean;
    init: StateInit;
}

export function storeDeployParameters(src: DeployParameters) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.mode, 257);
        if (src.body !== null && src.body !== undefined) { b_0.storeBit(true).storeRef(src.body); } else { b_0.storeBit(false); }
        b_0.storeInt(src.value, 257);
        b_0.storeBit(src.bounce);
        b_0.store(storeStateInit(src.init));
    };
}

export function loadDeployParameters(slice: Slice) {
    const sc_0 = slice;
    const _mode = sc_0.loadIntBig(257);
    const _body = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _value = sc_0.loadIntBig(257);
    const _bounce = sc_0.loadBit();
    const _init = loadStateInit(sc_0);
    return { $$type: 'DeployParameters' as const, mode: _mode, body: _body, value: _value, bounce: _bounce, init: _init };
}

export function loadTupleDeployParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _bounce = source.readBoolean();
    const _init = loadTupleStateInit(source);
    return { $$type: 'DeployParameters' as const, mode: _mode, body: _body, value: _value, bounce: _bounce, init: _init };
}

export function loadGetterTupleDeployParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _bounce = source.readBoolean();
    const _init = loadGetterTupleStateInit(source);
    return { $$type: 'DeployParameters' as const, mode: _mode, body: _body, value: _value, bounce: _bounce, init: _init };
}

export function storeTupleDeployParameters(source: DeployParameters) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.mode);
    builder.writeCell(source.body);
    builder.writeNumber(source.value);
    builder.writeBoolean(source.bounce);
    builder.writeTuple(storeTupleStateInit(source.init));
    return builder.build();
}

export function dictValueParserDeployParameters(): DictionaryValue<DeployParameters> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDeployParameters(src)).endCell());
        },
        parse: (src) => {
            return loadDeployParameters(src.loadRef().beginParse());
        }
    }
}

export type StdAddress = {
    $$type: 'StdAddress';
    workchain: bigint;
    address: bigint;
}

export function storeStdAddress(src: StdAddress) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.workchain, 8);
        b_0.storeUint(src.address, 256);
    };
}

export function loadStdAddress(slice: Slice) {
    const sc_0 = slice;
    const _workchain = sc_0.loadIntBig(8);
    const _address = sc_0.loadUintBig(256);
    return { $$type: 'StdAddress' as const, workchain: _workchain, address: _address };
}

export function loadTupleStdAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readBigNumber();
    return { $$type: 'StdAddress' as const, workchain: _workchain, address: _address };
}

export function loadGetterTupleStdAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readBigNumber();
    return { $$type: 'StdAddress' as const, workchain: _workchain, address: _address };
}

export function storeTupleStdAddress(source: StdAddress) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.workchain);
    builder.writeNumber(source.address);
    return builder.build();
}

export function dictValueParserStdAddress(): DictionaryValue<StdAddress> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeStdAddress(src)).endCell());
        },
        parse: (src) => {
            return loadStdAddress(src.loadRef().beginParse());
        }
    }
}

export type VarAddress = {
    $$type: 'VarAddress';
    workchain: bigint;
    address: Slice;
}

export function storeVarAddress(src: VarAddress) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.workchain, 32);
        b_0.storeRef(src.address.asCell());
    };
}

export function loadVarAddress(slice: Slice) {
    const sc_0 = slice;
    const _workchain = sc_0.loadIntBig(32);
    const _address = sc_0.loadRef().asSlice();
    return { $$type: 'VarAddress' as const, workchain: _workchain, address: _address };
}

export function loadTupleVarAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readCell().asSlice();
    return { $$type: 'VarAddress' as const, workchain: _workchain, address: _address };
}

export function loadGetterTupleVarAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readCell().asSlice();
    return { $$type: 'VarAddress' as const, workchain: _workchain, address: _address };
}

export function storeTupleVarAddress(source: VarAddress) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.workchain);
    builder.writeSlice(source.address.asCell());
    return builder.build();
}

export function dictValueParserVarAddress(): DictionaryValue<VarAddress> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeVarAddress(src)).endCell());
        },
        parse: (src) => {
            return loadVarAddress(src.loadRef().beginParse());
        }
    }
}

export type BasechainAddress = {
    $$type: 'BasechainAddress';
    hash: bigint | null;
}

export function storeBasechainAddress(src: BasechainAddress) {
    return (builder: Builder) => {
        const b_0 = builder;
        if (src.hash !== null && src.hash !== undefined) { b_0.storeBit(true).storeInt(src.hash, 257); } else { b_0.storeBit(false); }
    };
}

export function loadBasechainAddress(slice: Slice) {
    const sc_0 = slice;
    const _hash = sc_0.loadBit() ? sc_0.loadIntBig(257) : null;
    return { $$type: 'BasechainAddress' as const, hash: _hash };
}

export function loadTupleBasechainAddress(source: TupleReader) {
    const _hash = source.readBigNumberOpt();
    return { $$type: 'BasechainAddress' as const, hash: _hash };
}

export function loadGetterTupleBasechainAddress(source: TupleReader) {
    const _hash = source.readBigNumberOpt();
    return { $$type: 'BasechainAddress' as const, hash: _hash };
}

export function storeTupleBasechainAddress(source: BasechainAddress) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.hash);
    return builder.build();
}

export function dictValueParserBasechainAddress(): DictionaryValue<BasechainAddress> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeBasechainAddress(src)).endCell());
        },
        parse: (src) => {
            return loadBasechainAddress(src.loadRef().beginParse());
        }
    }
}

export type Deploy = {
    $$type: 'Deploy';
    queryId: bigint;
}

export function storeDeploy(src: Deploy) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2490013878, 32);
        b_0.storeUint(src.queryId, 64);
    };
}

export function loadDeploy(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2490013878) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    return { $$type: 'Deploy' as const, queryId: _queryId };
}

export function loadTupleDeploy(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'Deploy' as const, queryId: _queryId };
}

export function loadGetterTupleDeploy(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'Deploy' as const, queryId: _queryId };
}

export function storeTupleDeploy(source: Deploy) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    return builder.build();
}

export function dictValueParserDeploy(): DictionaryValue<Deploy> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDeploy(src)).endCell());
        },
        parse: (src) => {
            return loadDeploy(src.loadRef().beginParse());
        }
    }
}

export type DeployOk = {
    $$type: 'DeployOk';
    queryId: bigint;
}

export function storeDeployOk(src: DeployOk) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2952335191, 32);
        b_0.storeUint(src.queryId, 64);
    };
}

export function loadDeployOk(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2952335191) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    return { $$type: 'DeployOk' as const, queryId: _queryId };
}

export function loadTupleDeployOk(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'DeployOk' as const, queryId: _queryId };
}

export function loadGetterTupleDeployOk(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'DeployOk' as const, queryId: _queryId };
}

export function storeTupleDeployOk(source: DeployOk) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    return builder.build();
}

export function dictValueParserDeployOk(): DictionaryValue<DeployOk> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDeployOk(src)).endCell());
        },
        parse: (src) => {
            return loadDeployOk(src.loadRef().beginParse());
        }
    }
}

export type FactoryDeploy = {
    $$type: 'FactoryDeploy';
    queryId: bigint;
    cashback: Address;
}

export function storeFactoryDeploy(src: FactoryDeploy) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1829761339, 32);
        b_0.storeUint(src.queryId, 64);
        b_0.storeAddress(src.cashback);
    };
}

export function loadFactoryDeploy(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1829761339) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    const _cashback = sc_0.loadAddress();
    return { $$type: 'FactoryDeploy' as const, queryId: _queryId, cashback: _cashback };
}

export function loadTupleFactoryDeploy(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _cashback = source.readAddress();
    return { $$type: 'FactoryDeploy' as const, queryId: _queryId, cashback: _cashback };
}

export function loadGetterTupleFactoryDeploy(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _cashback = source.readAddress();
    return { $$type: 'FactoryDeploy' as const, queryId: _queryId, cashback: _cashback };
}

export function storeTupleFactoryDeploy(source: FactoryDeploy) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    builder.writeAddress(source.cashback);
    return builder.build();
}

export function dictValueParserFactoryDeploy(): DictionaryValue<FactoryDeploy> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeFactoryDeploy(src)).endCell());
        },
        parse: (src) => {
            return loadFactoryDeploy(src.loadRef().beginParse());
        }
    }
}

export type SetFee = {
    $$type: 'SetFee';
    queryId: bigint;
    perValidatorFee: bigint;
}

export function storeSetFee(src: SetFee) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1397118034, 32);
        b_0.storeUint(src.queryId, 64);
        b_0.storeCoins(src.perValidatorFee);
    };
}

export function loadSetFee(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1397118034) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    const _perValidatorFee = sc_0.loadCoins();
    return { $$type: 'SetFee' as const, queryId: _queryId, perValidatorFee: _perValidatorFee };
}

export function loadTupleSetFee(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _perValidatorFee = source.readBigNumber();
    return { $$type: 'SetFee' as const, queryId: _queryId, perValidatorFee: _perValidatorFee };
}

export function loadGetterTupleSetFee(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _perValidatorFee = source.readBigNumber();
    return { $$type: 'SetFee' as const, queryId: _queryId, perValidatorFee: _perValidatorFee };
}

export function storeTupleSetFee(source: SetFee) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    builder.writeNumber(source.perValidatorFee);
    return builder.build();
}

export function dictValueParserSetFee(): DictionaryValue<SetFee> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeSetFee(src)).endCell());
        },
        parse: (src) => {
            return loadSetFee(src.loadRef().beginParse());
        }
    }
}

export type Fund = {
    $$type: 'Fund';
    queryId: bigint;
}

export function storeFund(src: Fund) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1179534422, 32);
        b_0.storeUint(src.queryId, 64);
    };
}

export function loadFund(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1179534422) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    return { $$type: 'Fund' as const, queryId: _queryId };
}

export function loadTupleFund(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'Fund' as const, queryId: _queryId };
}

export function loadGetterTupleFund(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'Fund' as const, queryId: _queryId };
}

export function storeTupleFund(source: Fund) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    return builder.build();
}

export function dictValueParserFund(): DictionaryValue<Fund> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeFund(src)).endCell());
        },
        parse: (src) => {
            return loadFund(src.loadRef().beginParse());
        }
    }
}

export type Withdraw = {
    $$type: 'Withdraw';
    queryId: bigint;
    recipient: Address;
    amount: bigint;
}

export function storeWithdraw(src: Withdraw) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1464095816, 32);
        b_0.storeUint(src.queryId, 64);
        b_0.storeAddress(src.recipient);
        b_0.storeCoins(src.amount);
    };
}

export function loadWithdraw(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1464095816) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    const _recipient = sc_0.loadAddress();
    const _amount = sc_0.loadCoins();
    return { $$type: 'Withdraw' as const, queryId: _queryId, recipient: _recipient, amount: _amount };
}

export function loadTupleWithdraw(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _recipient = source.readAddress();
    const _amount = source.readBigNumber();
    return { $$type: 'Withdraw' as const, queryId: _queryId, recipient: _recipient, amount: _amount };
}

export function loadGetterTupleWithdraw(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _recipient = source.readAddress();
    const _amount = source.readBigNumber();
    return { $$type: 'Withdraw' as const, queryId: _queryId, recipient: _recipient, amount: _amount };
}

export function storeTupleWithdraw(source: Withdraw) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    builder.writeAddress(source.recipient);
    builder.writeNumber(source.amount);
    return builder.build();
}

export function dictValueParserWithdraw(): DictionaryValue<Withdraw> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeWithdraw(src)).endCell());
        },
        parse: (src) => {
            return loadWithdraw(src.loadRef().beginParse());
        }
    }
}

export type SetDepositor = {
    $$type: 'SetDepositor';
    queryId: bigint;
    depositor: Address;
}

export function storeSetDepositor(src: SetDepositor) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1396983120, 32);
        b_0.storeUint(src.queryId, 64);
        b_0.storeAddress(src.depositor);
    };
}

export function loadSetDepositor(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1396983120) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    const _depositor = sc_0.loadAddress();
    return { $$type: 'SetDepositor' as const, queryId: _queryId, depositor: _depositor };
}

export function loadTupleSetDepositor(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _depositor = source.readAddress();
    return { $$type: 'SetDepositor' as const, queryId: _queryId, depositor: _depositor };
}

export function loadGetterTupleSetDepositor(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _depositor = source.readAddress();
    return { $$type: 'SetDepositor' as const, queryId: _queryId, depositor: _depositor };
}

export function storeTupleSetDepositor(source: SetDepositor) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    builder.writeAddress(source.depositor);
    return builder.build();
}

export function dictValueParserSetDepositor(): DictionaryValue<SetDepositor> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeSetDepositor(src)).endCell());
        },
        parse: (src) => {
            return loadSetDepositor(src.loadRef().beginParse());
        }
    }
}

export type PauseBeaconDeposits = {
    $$type: 'PauseBeaconDeposits';
    queryId: bigint;
}

export function storePauseBeaconDeposits(src: PauseBeaconDeposits) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1346458963, 32);
        b_0.storeUint(src.queryId, 64);
    };
}

export function loadPauseBeaconDeposits(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1346458963) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    return { $$type: 'PauseBeaconDeposits' as const, queryId: _queryId };
}

export function loadTuplePauseBeaconDeposits(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'PauseBeaconDeposits' as const, queryId: _queryId };
}

export function loadGetterTuplePauseBeaconDeposits(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'PauseBeaconDeposits' as const, queryId: _queryId };
}

export function storeTuplePauseBeaconDeposits(source: PauseBeaconDeposits) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    return builder.build();
}

export function dictValueParserPauseBeaconDeposits(): DictionaryValue<PauseBeaconDeposits> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storePauseBeaconDeposits(src)).endCell());
        },
        parse: (src) => {
            return loadPauseBeaconDeposits(src.loadRef().beginParse());
        }
    }
}

export type ResumeBeaconDeposits = {
    $$type: 'ResumeBeaconDeposits';
    queryId: bigint;
}

export function storeResumeBeaconDeposits(src: ResumeBeaconDeposits) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1380275021, 32);
        b_0.storeUint(src.queryId, 64);
    };
}

export function loadResumeBeaconDeposits(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1380275021) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    return { $$type: 'ResumeBeaconDeposits' as const, queryId: _queryId };
}

export function loadTupleResumeBeaconDeposits(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'ResumeBeaconDeposits' as const, queryId: _queryId };
}

export function loadGetterTupleResumeBeaconDeposits(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'ResumeBeaconDeposits' as const, queryId: _queryId };
}

export function storeTupleResumeBeaconDeposits(source: ResumeBeaconDeposits) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    return builder.build();
}

export function dictValueParserResumeBeaconDeposits(): DictionaryValue<ResumeBeaconDeposits> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeResumeBeaconDeposits(src)).endCell());
        },
        parse: (src) => {
            return loadResumeBeaconDeposits(src.loadRef().beginParse());
        }
    }
}

export type DepositToBeacon = {
    $$type: 'DepositToBeacon';
    queryId: bigint;
    validatorsCount: bigint;
    totalAmount: bigint;
}

export function storeDepositToBeacon(src: DepositToBeacon) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1145196627, 32);
        b_0.storeUint(src.queryId, 64);
        b_0.storeUint(src.validatorsCount, 16);
        b_0.storeCoins(src.totalAmount);
    };
}

export function loadDepositToBeacon(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1145196627) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    const _validatorsCount = sc_0.loadUintBig(16);
    const _totalAmount = sc_0.loadCoins();
    return { $$type: 'DepositToBeacon' as const, queryId: _queryId, validatorsCount: _validatorsCount, totalAmount: _totalAmount };
}

export function loadTupleDepositToBeacon(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _validatorsCount = source.readBigNumber();
    const _totalAmount = source.readBigNumber();
    return { $$type: 'DepositToBeacon' as const, queryId: _queryId, validatorsCount: _validatorsCount, totalAmount: _totalAmount };
}

export function loadGetterTupleDepositToBeacon(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _validatorsCount = source.readBigNumber();
    const _totalAmount = source.readBigNumber();
    return { $$type: 'DepositToBeacon' as const, queryId: _queryId, validatorsCount: _validatorsCount, totalAmount: _totalAmount };
}

export function storeTupleDepositToBeacon(source: DepositToBeacon) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    builder.writeNumber(source.validatorsCount);
    builder.writeNumber(source.totalAmount);
    return builder.build();
}

export function dictValueParserDepositToBeacon(): DictionaryValue<DepositToBeacon> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDepositToBeacon(src)).endCell());
        },
        parse: (src) => {
            return loadDepositToBeacon(src.loadRef().beginParse());
        }
    }
}

export type RequestValidatorExit = {
    $$type: 'RequestValidatorExit';
    queryId: bigint;
    validatorsCount: bigint;
}

export function storeRequestValidatorExit(src: RequestValidatorExit) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1380276308, 32);
        b_0.storeUint(src.queryId, 64);
        b_0.storeUint(src.validatorsCount, 16);
    };
}

export function loadRequestValidatorExit(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1380276308) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    const _validatorsCount = sc_0.loadUintBig(16);
    return { $$type: 'RequestValidatorExit' as const, queryId: _queryId, validatorsCount: _validatorsCount };
}

export function loadTupleRequestValidatorExit(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _validatorsCount = source.readBigNumber();
    return { $$type: 'RequestValidatorExit' as const, queryId: _queryId, validatorsCount: _validatorsCount };
}

export function loadGetterTupleRequestValidatorExit(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _validatorsCount = source.readBigNumber();
    return { $$type: 'RequestValidatorExit' as const, queryId: _queryId, validatorsCount: _validatorsCount };
}

export function storeTupleRequestValidatorExit(source: RequestValidatorExit) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    builder.writeNumber(source.validatorsCount);
    return builder.build();
}

export function dictValueParserRequestValidatorExit(): DictionaryValue<RequestValidatorExit> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeRequestValidatorExit(src)).endCell());
        },
        parse: (src) => {
            return loadRequestValidatorExit(src.loadRef().beginParse());
        }
    }
}

export type TriggerValidatorWithdrawal = {
    $$type: 'TriggerValidatorWithdrawal';
    queryId: bigint;
    validatorsCount: bigint;
    refundRecipient: Address;
}

export function storeTriggerValidatorWithdrawal(src: TriggerValidatorWithdrawal) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1414682436, 32);
        b_0.storeUint(src.queryId, 64);
        b_0.storeUint(src.validatorsCount, 16);
        b_0.storeAddress(src.refundRecipient);
    };
}

export function loadTriggerValidatorWithdrawal(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1414682436) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    const _validatorsCount = sc_0.loadUintBig(16);
    const _refundRecipient = sc_0.loadAddress();
    return { $$type: 'TriggerValidatorWithdrawal' as const, queryId: _queryId, validatorsCount: _validatorsCount, refundRecipient: _refundRecipient };
}

export function loadTupleTriggerValidatorWithdrawal(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _validatorsCount = source.readBigNumber();
    const _refundRecipient = source.readAddress();
    return { $$type: 'TriggerValidatorWithdrawal' as const, queryId: _queryId, validatorsCount: _validatorsCount, refundRecipient: _refundRecipient };
}

export function loadGetterTupleTriggerValidatorWithdrawal(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _validatorsCount = source.readBigNumber();
    const _refundRecipient = source.readAddress();
    return { $$type: 'TriggerValidatorWithdrawal' as const, queryId: _queryId, validatorsCount: _validatorsCount, refundRecipient: _refundRecipient };
}

export function storeTupleTriggerValidatorWithdrawal(source: TriggerValidatorWithdrawal) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    builder.writeNumber(source.validatorsCount);
    builder.writeAddress(source.refundRecipient);
    return builder.build();
}

export function dictValueParserTriggerValidatorWithdrawal(): DictionaryValue<TriggerValidatorWithdrawal> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeTriggerValidatorWithdrawal(src)).endCell());
        },
        parse: (src) => {
            return loadTriggerValidatorWithdrawal(src.loadRef().beginParse());
        }
    }
}

export type AdapterTriggerWithdrawal = {
    $$type: 'AdapterTriggerWithdrawal';
    queryId: bigint;
    validatorsCount: bigint;
}

export function storeAdapterTriggerWithdrawal(src: AdapterTriggerWithdrawal) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1096044631, 32);
        b_0.storeUint(src.queryId, 64);
        b_0.storeUint(src.validatorsCount, 16);
    };
}

export function loadAdapterTriggerWithdrawal(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1096044631) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    const _validatorsCount = sc_0.loadUintBig(16);
    return { $$type: 'AdapterTriggerWithdrawal' as const, queryId: _queryId, validatorsCount: _validatorsCount };
}

export function loadTupleAdapterTriggerWithdrawal(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _validatorsCount = source.readBigNumber();
    return { $$type: 'AdapterTriggerWithdrawal' as const, queryId: _queryId, validatorsCount: _validatorsCount };
}

export function loadGetterTupleAdapterTriggerWithdrawal(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _validatorsCount = source.readBigNumber();
    return { $$type: 'AdapterTriggerWithdrawal' as const, queryId: _queryId, validatorsCount: _validatorsCount };
}

export function storeTupleAdapterTriggerWithdrawal(source: AdapterTriggerWithdrawal) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    builder.writeNumber(source.validatorsCount);
    return builder.build();
}

export function dictValueParserAdapterTriggerWithdrawal(): DictionaryValue<AdapterTriggerWithdrawal> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeAdapterTriggerWithdrawal(src)).endCell());
        },
        parse: (src) => {
            return loadAdapterTriggerWithdrawal(src.loadRef().beginParse());
        }
    }
}

export type AuthorizeUpgrade = {
    $$type: 'AuthorizeUpgrade';
    queryId: bigint;
    codeHash: bigint;
}

export function storeAuthorizeUpgrade(src: AuthorizeUpgrade) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1096110151, 32);
        b_0.storeUint(src.queryId, 64);
        b_0.storeUint(src.codeHash, 256);
    };
}

export function loadAuthorizeUpgrade(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1096110151) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    const _codeHash = sc_0.loadUintBig(256);
    return { $$type: 'AuthorizeUpgrade' as const, queryId: _queryId, codeHash: _codeHash };
}

export function loadTupleAuthorizeUpgrade(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _codeHash = source.readBigNumber();
    return { $$type: 'AuthorizeUpgrade' as const, queryId: _queryId, codeHash: _codeHash };
}

export function loadGetterTupleAuthorizeUpgrade(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _codeHash = source.readBigNumber();
    return { $$type: 'AuthorizeUpgrade' as const, queryId: _queryId, codeHash: _codeHash };
}

export function storeTupleAuthorizeUpgrade(source: AuthorizeUpgrade) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    builder.writeNumber(source.codeHash);
    return builder.build();
}

export function dictValueParserAuthorizeUpgrade(): DictionaryValue<AuthorizeUpgrade> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeAuthorizeUpgrade(src)).endCell());
        },
        parse: (src) => {
            return loadAuthorizeUpgrade(src.loadRef().beginParse());
        }
    }
}

export type StakingVault$Data = {
    $$type: 'StakingVault$Data';
    owner: Address;
    nodeOperator: Address;
    depositor: Address;
    upgradeController: Address;
    withdrawalAdapter: Address;
    beaconChainDepositsPaused: boolean;
    ossified: boolean;
    version: bigint;
    withdrawalFeePerValidator: bigint;
    pendingQueryId: bigint;
    pendingFee: bigint;
    pendingRefundRecipient: Address;
    activeCodeHash: bigint;
}

export function storeStakingVault$Data(src: StakingVault$Data) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeAddress(src.owner);
        b_0.storeAddress(src.nodeOperator);
        b_0.storeAddress(src.depositor);
        const b_1 = new Builder();
        b_1.storeAddress(src.upgradeController);
        b_1.storeAddress(src.withdrawalAdapter);
        b_1.storeBit(src.beaconChainDepositsPaused);
        b_1.storeBit(src.ossified);
        b_1.storeUint(src.version, 16);
        b_1.storeCoins(src.withdrawalFeePerValidator);
        b_1.storeUint(src.pendingQueryId, 64);
        b_1.storeCoins(src.pendingFee);
        const b_2 = new Builder();
        b_2.storeAddress(src.pendingRefundRecipient);
        b_2.storeUint(src.activeCodeHash, 256);
        b_1.storeRef(b_2.endCell());
        b_0.storeRef(b_1.endCell());
    };
}

export function loadStakingVault$Data(slice: Slice) {
    const sc_0 = slice;
    const _owner = sc_0.loadAddress();
    const _nodeOperator = sc_0.loadAddress();
    const _depositor = sc_0.loadAddress();
    const sc_1 = sc_0.loadRef().beginParse();
    const _upgradeController = sc_1.loadAddress();
    const _withdrawalAdapter = sc_1.loadAddress();
    const _beaconChainDepositsPaused = sc_1.loadBit();
    const _ossified = sc_1.loadBit();
    const _version = sc_1.loadUintBig(16);
    const _withdrawalFeePerValidator = sc_1.loadCoins();
    const _pendingQueryId = sc_1.loadUintBig(64);
    const _pendingFee = sc_1.loadCoins();
    const sc_2 = sc_1.loadRef().beginParse();
    const _pendingRefundRecipient = sc_2.loadAddress();
    const _activeCodeHash = sc_2.loadUintBig(256);
    return { $$type: 'StakingVault$Data' as const, owner: _owner, nodeOperator: _nodeOperator, depositor: _depositor, upgradeController: _upgradeController, withdrawalAdapter: _withdrawalAdapter, beaconChainDepositsPaused: _beaconChainDepositsPaused, ossified: _ossified, version: _version, withdrawalFeePerValidator: _withdrawalFeePerValidator, pendingQueryId: _pendingQueryId, pendingFee: _pendingFee, pendingRefundRecipient: _pendingRefundRecipient, activeCodeHash: _activeCodeHash };
}

export function loadTupleStakingVault$Data(source: TupleReader) {
    const _owner = source.readAddress();
    const _nodeOperator = source.readAddress();
    const _depositor = source.readAddress();
    const _upgradeController = source.readAddress();
    const _withdrawalAdapter = source.readAddress();
    const _beaconChainDepositsPaused = source.readBoolean();
    const _ossified = source.readBoolean();
    const _version = source.readBigNumber();
    const _withdrawalFeePerValidator = source.readBigNumber();
    const _pendingQueryId = source.readBigNumber();
    const _pendingFee = source.readBigNumber();
    const _pendingRefundRecipient = source.readAddress();
    const _activeCodeHash = source.readBigNumber();
    return { $$type: 'StakingVault$Data' as const, owner: _owner, nodeOperator: _nodeOperator, depositor: _depositor, upgradeController: _upgradeController, withdrawalAdapter: _withdrawalAdapter, beaconChainDepositsPaused: _beaconChainDepositsPaused, ossified: _ossified, version: _version, withdrawalFeePerValidator: _withdrawalFeePerValidator, pendingQueryId: _pendingQueryId, pendingFee: _pendingFee, pendingRefundRecipient: _pendingRefundRecipient, activeCodeHash: _activeCodeHash };
}

export function loadGetterTupleStakingVault$Data(source: TupleReader) {
    const _owner = source.readAddress();
    const _nodeOperator = source.readAddress();
    const _depositor = source.readAddress();
    const _upgradeController = source.readAddress();
    const _withdrawalAdapter = source.readAddress();
    const _beaconChainDepositsPaused = source.readBoolean();
    const _ossified = source.readBoolean();
    const _version = source.readBigNumber();
    const _withdrawalFeePerValidator = source.readBigNumber();
    const _pendingQueryId = source.readBigNumber();
    const _pendingFee = source.readBigNumber();
    const _pendingRefundRecipient = source.readAddress();
    const _activeCodeHash = source.readBigNumber();
    return { $$type: 'StakingVault$Data' as const, owner: _owner, nodeOperator: _nodeOperator, depositor: _depositor, upgradeController: _upgradeController, withdrawalAdapter: _withdrawalAdapter, beaconChainDepositsPaused: _beaconChainDepositsPaused, ossified: _ossified, version: _version, withdrawalFeePerValidator: _withdrawalFeePerValidator, pendingQueryId: _pendingQueryId, pendingFee: _pendingFee, pendingRefundRecipient: _pendingRefundRecipient, activeCodeHash: _activeCodeHash };
}

export function storeTupleStakingVault$Data(source: StakingVault$Data) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.owner);
    builder.writeAddress(source.nodeOperator);
    builder.writeAddress(source.depositor);
    builder.writeAddress(source.upgradeController);
    builder.writeAddress(source.withdrawalAdapter);
    builder.writeBoolean(source.beaconChainDepositsPaused);
    builder.writeBoolean(source.ossified);
    builder.writeNumber(source.version);
    builder.writeNumber(source.withdrawalFeePerValidator);
    builder.writeNumber(source.pendingQueryId);
    builder.writeNumber(source.pendingFee);
    builder.writeAddress(source.pendingRefundRecipient);
    builder.writeNumber(source.activeCodeHash);
    return builder.build();
}

export function dictValueParserStakingVault$Data(): DictionaryValue<StakingVault$Data> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeStakingVault$Data(src)).endCell());
        },
        parse: (src) => {
            return loadStakingVault$Data(src.loadRef().beginParse());
        }
    }
}

 type StakingVault_init_args = {
    $$type: 'StakingVault_init_args';
    owner: Address;
    nodeOperator: Address;
    depositor: Address;
    upgradeController: Address;
    withdrawalAdapter: Address;
}

function initStakingVault_init_args(src: StakingVault_init_args) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeAddress(src.owner);
        b_0.storeAddress(src.nodeOperator);
        b_0.storeAddress(src.depositor);
        const b_1 = new Builder();
        b_1.storeAddress(src.upgradeController);
        b_1.storeAddress(src.withdrawalAdapter);
        b_0.storeRef(b_1.endCell());
    };
}

async function StakingVault_init(owner: Address, nodeOperator: Address, depositor: Address, upgradeController: Address, withdrawalAdapter: Address) {
    const __code = Cell.fromHex('b5ee9c7241023301000b8f000114ff00f4a413f4bcf2c80b0102016202160138d0eda2edfb01d072d721d200d200fa4021103450666f04f86102f8620303f6ed44d0d200018e29fa40fa40fa40d401d0fa40fa40d200d200d30ffa00d33ffa00d430d0fa40d3ff3010ad10ac10ab6c1d8e30fa40fa40fa40d401d0fa40fa403010251024102305d15503247070718208989680705300107c10671056104510344130e20ee302702dd74920c21fe30001c000925f0fe30df2c08204061301e80c8020d7217021d749c21f9430d31f01de821041545057ba8ed7d33fd30f5930315220ba9320c2009170e28e3f3152a07070036d6d50436d5033c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb007020de10ac5519e05f0e05005cc87f01ca0055c050cdce1ace18ce06c8ce15ce13ca00ca00cb0f01fa0212cb3f58fa0202c8ce13cbffcdcdc9ed5402fe310dd31f21821053465452ba8ee8313d0cd33f31fa003010bc10ab109a108910781067105610451034413ddb3c342cc200f2e06510bc10ab109a108910781067105610455502c87f01ca0055c050cdce1ace18ce06c8ce15ce13ca00ca00cb0f01fa0212cb3f58fa0202c8ce13cbffcdcdc9ed54db31e0218210464e4456ba140704c68ec45b3c10ac5519db3cf8416f24135f03c200f2e065c87f01ca0055c050cdce1ace18ce06c8ce15ce13ca00ca00cb0f01fa0212cb3f58fa0202c8ce13cbffcdcdc9ed54db31e021821057445448bae30221821053444550bae30221821050415553ba1408090a02aa313d0cd33f31fa40fa003050dedb3c2ec200f2e06550de7070036d6d50436d5033c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb0010ac5519141501ac313d0cd33f31fa403010bc10ab109a108910781067105610451034413ddb3c3a10bc10ab5508c87f01ca0055c050cdce1ace18ce06c8ce15ce13ca00ca00cb0f01fa0212cb3f58fa0202c8ce13cbffcdcdc9ed54db311404bc8ebf5b3c10ac5519db3c07b3f2e0687f07c87f01ca0055c050cdce1ace18ce06c8ce15ce13ca00ca00cb0f01fa0212cb3f58fa0202c8ce13cbffcdcdc9ed54db31e02182105245534dbae30221821044425053bae30221821052455854ba140b0c0d017c5b3c10ac5519db3c07f2e0697007c87f01ca0055c050cdce1ace18ce06c8ce15ce13ca00ca00cb0f01fa0212cb3f58fa0202c8ce13cbffcdcdc9ed54db311400ae313d0cd33f31d30ffa0030f8422bc705f2e06427b3f2e06701c200f2e066c200f2e06510ac5519c87f01ca0055c050cdce1ace18ce06c8ce15ce13ca00ca00cb0f01fa0212cb3f58fa0202c8ce13cbffcdcdc9ed54db3104ec8ed7313d0cd33f31d30f3010bc10ab109a108910781067105610451034413ddb3c0dc200f2e066550bc87f01ca0055c050cdce1ace18ce06c8ce15ce13ca00ca00cb0f01fa0212cb3f58fa0202c8ce13cbffcdcdc9ed54db31e021821054525744bae30221821041555047bae302218210946a98b6ba140e111203fc313d0cd33fd30ffa403010cd10bd10ad109d108d107d106d105d104d103d4defdb3c6c312bc200f2e066531ba8f8416f24135f0321bef2e06b547b0d0e7f1110c8598210415450575003cb1fcb3fcb0fc929544430011111017050346d036d5520c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf818ae2140f10001a58cf8680cf8480f400f400cf8101c6f400c901fb00f8416f24135f0358a120c2008e3b1e7070036d6d50436d5033c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb0092303de2109c108b107a106910581047103645401500b4313d3d0bd33f31d3ff30f84228c705f2e06424b3f2e06a10ac109b108a10791068105710461035443012c87f01ca0055c050cdce1ace18ce06c8ce15ce13ca00ca00cb0f01fa0212cb3f58fa0202c8ce13cbffcdcdc9ed54db3100fe8e7b313d0cd33f30c8018210aff90f5758cb1fcb3fc910bd10ac109b108a107910681057104610354430f84270705003804201503304c8cf8580ca00cf8440ce01fa02806acf40f400c901fb00c87f01ca0055c050cdce1ace18ce06c8ce15ce13ca00ca00cb0f01fa0212cb3f58fa0202c8ce13cbffcdcdc9ed54db31e00e02d8c21f8f65550cdb3c8b66f737369667981e01f90101f901ba8e4905b3f2e06a10ab109a10891078106710567f06104510344130c87f01ca0055c050cdce1ace18ce06c8ce15ce13ca00ca00cb0f01fa0212cb3f58fa0202c8ce13cbffcdcdc9ed54db31e0f2c066550be05f0e14150010f8422dc705f2e0640060c87f01ca0055c050cdce1ace18ce06c8ce15ce13ca00ca00cb0f01fa0212cb3f58fa0202c8ce13cbffcdcdc9ed54db3102012017220201201820020120191b01d5b76a1da89a1a400031c53f481f481f481a803a1f481f481a401a401a61ff401a67ff401a861a1f481a7fe60215a21582156d83b1c61f481f481f481a803a1f481f48060204a204820460ba2aa0648e0e0e30411312d00e0a60020f820ce20ac208a20688261c5b678d9a301a0002240201201c1e01d5b02e7b5134348000638a7e903e903e903500743e903e903480348034c3fe8034cffe80350c343e9034ffcc042b442b042adb07638c3e903e903e903500743e903e900c040944090408c1745540c91c1c1c60822625a01c14c0041f0419c4158411440d104c38b6cf1b34601d00022201d5b2697b5134348000638a7e903e903e903500743e903e903480348034c3fe8034cffe80350c343e9034ffcc042b442b042adb07638c3e903e903e903500743e903e900c040944090408c1745540c91c1c1c60822625a01c14c0041f0419c4158411440d104c38b6cf1b34601f00022c01d5b969fed44d0d200018e29fa40fa40fa40d401d0fa40fa40d200d200d30ffa00d33ffa00d430d0fa40d3ff3010ad10ac10ab6c1d8e30fa40fa40fa40d401d0fa40fa403010251024102305d15503247070718208989680705300107c10671056104510344130e2db3c6cd1821000227020120232501d5babc4ed44d0d200018e29fa40fa40fa40d401d0fa40fa40d200d200d30ffa00d33ffa00d430d0fa40d3ff3010ad10ac10ab6c1d8e30fa40fa40fa40d401d0fa40fa403010251024102305d15503247070718208989680705300107c10671056104510344130e2db3c6cd18240002260201202631020120272f020120282a01d5ac56f6a268690000c714fd207d207d206a00e87d207d20690069006987fd00699ffd006a18687d2069ff98085688560855b60ec7187d207d207d206a00e87d207d201808128812081182e8aa8192383838c1044c4b40382980083e0833882b0822881a2098716d9e3668c0290002230201202b2d01d4aa7ced44d0d200018e29fa40fa40fa40d401d0fa40fa40d200d200d30ffa00d33ffa00d430d0fa40d3ff3010ad10ac10ab6c1d8e30fa40fa40fa40d401d0fa40fa403010251024102305d15503247070718208989680705300107c10671056104510344130e2db3c6cd12c00022b01d4aad5ed44d0d200018e29fa40fa40fa40d401d0fa40fa40d200d200d30ffa00d33ffa00d430d0fa40d3ff3010ad10ac10ab6c1d8e30fa40fa40fa40d401d0fa40fa403010251024102305d15503247070718208989680705300107c10671056104510344130e2db3c6cd12e00022001d9b201fb5134348000638a7e903e903e903500743e903e903480348034c3fe8034cffe80350c343e9034ffcc042b442b042adb07638c3e903e903e903500743e903e900c040944090408c1745540c91c1c1c60822625a01c14c0041f0419c4158411440d104c38954336cf1b346030001020c200f2e06625a801d5b7aafda89a1a400031c53f481f481f481a803a1f481f481a401a401a61ff401a67ff401a861a1f481a7fe60215a21582156d83b1c61f481f481f481a803a1f481f48060204a204820460ba2aa0648e0e0e30411312d00e0a60020f820ce20ac208a20688261c5b678d9a303200022a9d27eae5');
    const builder = beginCell();
    builder.storeUint(0, 1);
    initStakingVault_init_args({ $$type: 'StakingVault_init_args', owner, nodeOperator, depositor, upgradeController, withdrawalAdapter })(builder);
    const __data = builder.endCell();
    return { code: __code, data: __data };
}

export const StakingVault_errors = {
    2: { message: "Stack underflow" },
    3: { message: "Stack overflow" },
    4: { message: "Integer overflow" },
    5: { message: "Integer out of expected range" },
    6: { message: "Invalid opcode" },
    7: { message: "Type check error" },
    8: { message: "Cell overflow" },
    9: { message: "Cell underflow" },
    10: { message: "Dictionary error" },
    11: { message: "'Unknown' error" },
    12: { message: "Fatal error" },
    13: { message: "Out of gas error" },
    14: { message: "Virtualization error" },
    32: { message: "Action list is invalid" },
    33: { message: "Action list is too long" },
    34: { message: "Action is invalid or not supported" },
    35: { message: "Invalid source address in outbound message" },
    36: { message: "Invalid destination address in outbound message" },
    37: { message: "Not enough Toncoin" },
    38: { message: "Not enough extra currencies" },
    39: { message: "Outbound message does not fit into a cell after rewriting" },
    40: { message: "Cannot process a message" },
    41: { message: "Library reference is null" },
    42: { message: "Library change action error" },
    43: { message: "Exceeded maximum number of cells in the library or the maximum depth of the Merkle tree" },
    50: { message: "Account state size exceeded limits" },
    128: { message: "Null reference exception" },
    129: { message: "Invalid serialization prefix" },
    130: { message: "Invalid incoming message" },
    131: { message: "Constraints error" },
    132: { message: "Access denied" },
    133: { message: "Contract stopped" },
    134: { message: "Invalid argument" },
    135: { message: "Code of a contract was not found" },
    136: { message: "Invalid standard address" },
    138: { message: "Not a basechain address" },
} as const

export const StakingVault_errors_backward = {
    "Stack underflow": 2,
    "Stack overflow": 3,
    "Integer overflow": 4,
    "Integer out of expected range": 5,
    "Invalid opcode": 6,
    "Type check error": 7,
    "Cell overflow": 8,
    "Cell underflow": 9,
    "Dictionary error": 10,
    "'Unknown' error": 11,
    "Fatal error": 12,
    "Out of gas error": 13,
    "Virtualization error": 14,
    "Action list is invalid": 32,
    "Action list is too long": 33,
    "Action is invalid or not supported": 34,
    "Invalid source address in outbound message": 35,
    "Invalid destination address in outbound message": 36,
    "Not enough Toncoin": 37,
    "Not enough extra currencies": 38,
    "Outbound message does not fit into a cell after rewriting": 39,
    "Cannot process a message": 40,
    "Library reference is null": 41,
    "Library change action error": 42,
    "Exceeded maximum number of cells in the library or the maximum depth of the Merkle tree": 43,
    "Account state size exceeded limits": 50,
    "Null reference exception": 128,
    "Invalid serialization prefix": 129,
    "Invalid incoming message": 130,
    "Constraints error": 131,
    "Access denied": 132,
    "Contract stopped": 133,
    "Invalid argument": 134,
    "Code of a contract was not found": 135,
    "Invalid standard address": 136,
    "Not a basechain address": 138,
} as const

const StakingVault_types: ABIType[] = [
    {"name":"DataSize","header":null,"fields":[{"name":"cells","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"bits","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"refs","type":{"kind":"simple","type":"int","optional":false,"format":257}}]},
    {"name":"SignedBundle","header":null,"fields":[{"name":"signature","type":{"kind":"simple","type":"fixed-bytes","optional":false,"format":64}},{"name":"signedData","type":{"kind":"simple","type":"slice","optional":false,"format":"remainder"}}]},
    {"name":"StateInit","header":null,"fields":[{"name":"code","type":{"kind":"simple","type":"cell","optional":false}},{"name":"data","type":{"kind":"simple","type":"cell","optional":false}}]},
    {"name":"Context","header":null,"fields":[{"name":"bounceable","type":{"kind":"simple","type":"bool","optional":false}},{"name":"sender","type":{"kind":"simple","type":"address","optional":false}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"raw","type":{"kind":"simple","type":"slice","optional":false}}]},
    {"name":"SendParameters","header":null,"fields":[{"name":"mode","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"body","type":{"kind":"simple","type":"cell","optional":true}},{"name":"code","type":{"kind":"simple","type":"cell","optional":true}},{"name":"data","type":{"kind":"simple","type":"cell","optional":true}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"to","type":{"kind":"simple","type":"address","optional":false}},{"name":"bounce","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"MessageParameters","header":null,"fields":[{"name":"mode","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"body","type":{"kind":"simple","type":"cell","optional":true}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"to","type":{"kind":"simple","type":"address","optional":false}},{"name":"bounce","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"DeployParameters","header":null,"fields":[{"name":"mode","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"body","type":{"kind":"simple","type":"cell","optional":true}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"bounce","type":{"kind":"simple","type":"bool","optional":false}},{"name":"init","type":{"kind":"simple","type":"StateInit","optional":false}}]},
    {"name":"StdAddress","header":null,"fields":[{"name":"workchain","type":{"kind":"simple","type":"int","optional":false,"format":8}},{"name":"address","type":{"kind":"simple","type":"uint","optional":false,"format":256}}]},
    {"name":"VarAddress","header":null,"fields":[{"name":"workchain","type":{"kind":"simple","type":"int","optional":false,"format":32}},{"name":"address","type":{"kind":"simple","type":"slice","optional":false}}]},
    {"name":"BasechainAddress","header":null,"fields":[{"name":"hash","type":{"kind":"simple","type":"int","optional":true,"format":257}}]},
    {"name":"Deploy","header":2490013878,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"DeployOk","header":2952335191,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"FactoryDeploy","header":1829761339,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"cashback","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"SetFee","header":1397118034,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"perValidatorFee","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}}]},
    {"name":"Fund","header":1179534422,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"Withdraw","header":1464095816,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"recipient","type":{"kind":"simple","type":"address","optional":false}},{"name":"amount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}}]},
    {"name":"SetDepositor","header":1396983120,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"depositor","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"PauseBeaconDeposits","header":1346458963,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"ResumeBeaconDeposits","header":1380275021,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"DepositToBeacon","header":1145196627,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"validatorsCount","type":{"kind":"simple","type":"uint","optional":false,"format":16}},{"name":"totalAmount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}}]},
    {"name":"RequestValidatorExit","header":1380276308,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"validatorsCount","type":{"kind":"simple","type":"uint","optional":false,"format":16}}]},
    {"name":"TriggerValidatorWithdrawal","header":1414682436,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"validatorsCount","type":{"kind":"simple","type":"uint","optional":false,"format":16}},{"name":"refundRecipient","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"AdapterTriggerWithdrawal","header":1096044631,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"validatorsCount","type":{"kind":"simple","type":"uint","optional":false,"format":16}}]},
    {"name":"AuthorizeUpgrade","header":1096110151,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"codeHash","type":{"kind":"simple","type":"uint","optional":false,"format":256}}]},
    {"name":"StakingVault$Data","header":null,"fields":[{"name":"owner","type":{"kind":"simple","type":"address","optional":false}},{"name":"nodeOperator","type":{"kind":"simple","type":"address","optional":false}},{"name":"depositor","type":{"kind":"simple","type":"address","optional":false}},{"name":"upgradeController","type":{"kind":"simple","type":"address","optional":false}},{"name":"withdrawalAdapter","type":{"kind":"simple","type":"address","optional":false}},{"name":"beaconChainDepositsPaused","type":{"kind":"simple","type":"bool","optional":false}},{"name":"ossified","type":{"kind":"simple","type":"bool","optional":false}},{"name":"version","type":{"kind":"simple","type":"uint","optional":false,"format":16}},{"name":"withdrawalFeePerValidator","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"pendingQueryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"pendingFee","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"pendingRefundRecipient","type":{"kind":"simple","type":"address","optional":false}},{"name":"activeCodeHash","type":{"kind":"simple","type":"uint","optional":false,"format":256}}]},
]

const StakingVault_opcodes = {
    "Deploy": 2490013878,
    "DeployOk": 2952335191,
    "FactoryDeploy": 1829761339,
    "SetFee": 1397118034,
    "Fund": 1179534422,
    "Withdraw": 1464095816,
    "SetDepositor": 1396983120,
    "PauseBeaconDeposits": 1346458963,
    "ResumeBeaconDeposits": 1380275021,
    "DepositToBeacon": 1145196627,
    "RequestValidatorExit": 1380276308,
    "TriggerValidatorWithdrawal": 1414682436,
    "AdapterTriggerWithdrawal": 1096044631,
    "AuthorizeUpgrade": 1096110151,
}

const StakingVault_getters: ABIGetter[] = [
    {"name":"get_owner","methodId":80293,"arguments":[],"returnType":{"kind":"simple","type":"address","optional":false}},
    {"name":"get_node_operator","methodId":117372,"arguments":[],"returnType":{"kind":"simple","type":"address","optional":false}},
    {"name":"get_depositor","methodId":130391,"arguments":[],"returnType":{"kind":"simple","type":"address","optional":false}},
    {"name":"get_paused","methodId":87711,"arguments":[],"returnType":{"kind":"simple","type":"bool","optional":false}},
    {"name":"get_ossified","methodId":109508,"arguments":[],"returnType":{"kind":"simple","type":"bool","optional":false}},
    {"name":"get_withdrawal_fee_per_validator","methodId":72528,"arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"get_active_code_hash","methodId":118485,"arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"get_pending_query_id","methodId":114861,"arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"get_pending_fee","methodId":73913,"arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"calculate_validator_withdrawal_fee","methodId":120839,"arguments":[{"name":"keysCount","type":{"kind":"simple","type":"int","optional":false,"format":257}}],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
]

export const StakingVault_getterMapping: { [key: string]: string } = {
    'get_owner': 'getGetOwner',
    'get_node_operator': 'getGetNodeOperator',
    'get_depositor': 'getGetDepositor',
    'get_paused': 'getGetPaused',
    'get_ossified': 'getGetOssified',
    'get_withdrawal_fee_per_validator': 'getGetWithdrawalFeePerValidator',
    'get_active_code_hash': 'getGetActiveCodeHash',
    'get_pending_query_id': 'getGetPendingQueryId',
    'get_pending_fee': 'getGetPendingFee',
    'calculate_validator_withdrawal_fee': 'getCalculateValidatorWithdrawalFee',
}

const StakingVault_receivers: ABIReceiver[] = [
    {"receiver":"internal","message":{"kind":"typed","type":"SetFee"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Fund"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Withdraw"}},
    {"receiver":"internal","message":{"kind":"typed","type":"SetDepositor"}},
    {"receiver":"internal","message":{"kind":"typed","type":"PauseBeaconDeposits"}},
    {"receiver":"internal","message":{"kind":"typed","type":"ResumeBeaconDeposits"}},
    {"receiver":"internal","message":{"kind":"typed","type":"DepositToBeacon"}},
    {"receiver":"internal","message":{"kind":"typed","type":"RequestValidatorExit"}},
    {"receiver":"internal","message":{"kind":"typed","type":"TriggerValidatorWithdrawal"}},
    {"receiver":"internal","message":{"kind":"typed","type":"AuthorizeUpgrade"}},
    {"receiver":"internal","message":{"kind":"text"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Deploy"}},
]

export const OP_FUND = 1179995716n;
export const OP_WITHDRAW = 1464095816n;
export const OP_SET_DEPOSITOR = 1396983120n;
export const OP_PAUSE_DEPOSITS = 1346458963n;
export const OP_RESUME_DEPOSITS = 1380275021n;
export const OP_DEPOSIT_TO_BEACON = 1145196627n;
export const OP_REQUEST_EXIT = 1380276308n;
export const OP_TRIGGER_WITHDRAWAL = 1414682436n;
export const OP_OSSIFY = 1330860870n;
export const OP_AUTH_UPGRADE = 1096110151n;
export const E_UNAUTHORIZED = 100n;
export const E_ZERO_VALUE = 101n;
export const E_INVALID_ARG = 102n;
export const E_PAUSED = 103n;
export const E_ALREADY_PAUSED = 104n;
export const E_ALREADY_RESUMED = 105n;
export const E_OSSIFIED = 106n;
export const E_INSUFFICIENT_FEE = 107n;
export const E_UPGRADE_NOT_AUTHORIZED = 108n;

export class StakingVault implements Contract {
    
    public static readonly storageReserve = 0n;
    public static readonly errors = StakingVault_errors_backward;
    public static readonly opcodes = StakingVault_opcodes;
    
    static async init(owner: Address, nodeOperator: Address, depositor: Address, upgradeController: Address, withdrawalAdapter: Address) {
        return await StakingVault_init(owner, nodeOperator, depositor, upgradeController, withdrawalAdapter);
    }
    
    static async fromInit(owner: Address, nodeOperator: Address, depositor: Address, upgradeController: Address, withdrawalAdapter: Address) {
        const __gen_init = await StakingVault_init(owner, nodeOperator, depositor, upgradeController, withdrawalAdapter);
        const address = contractAddress(0, __gen_init);
        return new StakingVault(address, __gen_init);
    }
    
    static fromAddress(address: Address) {
        return new StakingVault(address);
    }
    
    readonly address: Address; 
    readonly init?: { code: Cell, data: Cell };
    readonly abi: ContractABI = {
        types:  StakingVault_types,
        getters: StakingVault_getters,
        receivers: StakingVault_receivers,
        errors: StakingVault_errors,
    };
    
    constructor(address: Address, init?: { code: Cell, data: Cell }) {
        this.address = address;
        this.init = init;
    }
    
    async send(provider: ContractProvider, via: Sender, args: { value: bigint, bounce?: boolean| null | undefined }, message: SetFee | Fund | Withdraw | SetDepositor | PauseBeaconDeposits | ResumeBeaconDeposits | DepositToBeacon | RequestValidatorExit | TriggerValidatorWithdrawal | AuthorizeUpgrade | string | Deploy) {
        
        let body: Cell | null = null;
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'SetFee') {
            body = beginCell().store(storeSetFee(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Fund') {
            body = beginCell().store(storeFund(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Withdraw') {
            body = beginCell().store(storeWithdraw(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'SetDepositor') {
            body = beginCell().store(storeSetDepositor(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'PauseBeaconDeposits') {
            body = beginCell().store(storePauseBeaconDeposits(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'ResumeBeaconDeposits') {
            body = beginCell().store(storeResumeBeaconDeposits(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'DepositToBeacon') {
            body = beginCell().store(storeDepositToBeacon(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'RequestValidatorExit') {
            body = beginCell().store(storeRequestValidatorExit(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'TriggerValidatorWithdrawal') {
            body = beginCell().store(storeTriggerValidatorWithdrawal(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'AuthorizeUpgrade') {
            body = beginCell().store(storeAuthorizeUpgrade(message)).endCell();
        }
        if (typeof message === 'string') {
            body = beginCell().storeUint(0, 32).storeStringTail(message).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Deploy') {
            body = beginCell().store(storeDeploy(message)).endCell();
        }
        if (body === null) { throw new Error('Invalid message type'); }
        
        await provider.internal(via, { ...args, body: body });
        
    }
    
    async getGetOwner(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('get_owner', builder.build())).stack;
        const result = source.readAddress();
        return result;
    }
    
    async getGetNodeOperator(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('get_node_operator', builder.build())).stack;
        const result = source.readAddress();
        return result;
    }
    
    async getGetDepositor(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('get_depositor', builder.build())).stack;
        const result = source.readAddress();
        return result;
    }
    
    async getGetPaused(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('get_paused', builder.build())).stack;
        const result = source.readBoolean();
        return result;
    }
    
    async getGetOssified(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('get_ossified', builder.build())).stack;
        const result = source.readBoolean();
        return result;
    }
    
    async getGetWithdrawalFeePerValidator(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('get_withdrawal_fee_per_validator', builder.build())).stack;
        const result = source.readBigNumber();
        return result;
    }
    
    async getGetActiveCodeHash(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('get_active_code_hash', builder.build())).stack;
        const result = source.readBigNumber();
        return result;
    }
    
    async getGetPendingQueryId(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('get_pending_query_id', builder.build())).stack;
        const result = source.readBigNumber();
        return result;
    }
    
    async getGetPendingFee(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('get_pending_fee', builder.build())).stack;
        const result = source.readBigNumber();
        return result;
    }
    
    async getCalculateValidatorWithdrawalFee(provider: ContractProvider, keysCount: bigint) {
        const builder = new TupleBuilder();
        builder.writeNumber(keysCount);
        const source = (await provider.get('calculate_validator_withdrawal_fee', builder.build())).stack;
        const result = source.readBigNumber();
        return result;
    }
    
}