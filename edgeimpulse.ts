namespace edgeimpulse {
    const PXT_COMM_SIZE = 1024

    //% shim=edgeimpulse::_invokeModel
    declare function _invoke(model: Buffer, inp: Buffer, res: Buffer): number;

    //% shim=edgeimpulse::_pxt_comm_base
    declare function _pxt_comm_base(): number;

    //% shim=edgeimpulse::_updateImports
    declare function _updateImports(buf: Buffer): void;

    export function validateAndRewriteModelHeader(buf: Buffer) {
        if (buf.length < 32 * 4)
            throw "ei: first block of model too small"
        const [magic, textBase, ramStart, ramEnd] = buf.unpack("4I")
        if (magic != 0x30564945)
            throw "ei: bad magic"
        const expectedBase = binstore.dataAddress()
        if (!expectedBase)
            throw "ei: binstore not available"
        if (textBase != expectedBase)
            throw "ei: text base should be " + expectedBase + " but is " + textBase
        if (ramStart != _pxt_comm_base())
            throw "ei: RAM base should be " + _pxt_comm_base() + " but is " + ramStart
        if (ramEnd - ramStart > PXT_COMM_SIZE)
            throw "ei: RAM usage too high: " + (ramEnd - ramStart) + " (max " + PXT_COMM_SIZE + ")"
        _updateImports(buf)
    }


    export function shapeElements(shape: number[]) {
        let res = 1
        for (const s of shape) res *= s
        return res
    }

    export function shapeSize(shape: number[]) {
        return shapeElements(shape) << 2
    }

    export class Model {
        constructor(public model: Buffer) {
        }

        private header(off: number) {
            return this.model.getNumber(NumberFormat.UInt32LE, off << 2)
        }

        get inputShape() {
            return [this.header(36), this.header(37)]
        }
        get outputShape() {
            return [this.header(39)]
        }

        invoke(input: Buffer) {
            if (input.length != shapeSize(this.inputShape))
                throw "ei: bad input size"
            const classifications = Buffer.create(shapeSize(this.outputShape))
            const err = _invoke(this.model, input, classifications)
            if (err)
                throw "ei: invoke error " + err
            return classifications
        }
    }
}
