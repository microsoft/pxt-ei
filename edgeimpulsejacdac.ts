namespace jacdac {
    export class EIHost extends MLHost {
        model: edgeimpulse.Model

        constructor(agg: SensorAggregatorHost) {
            super("ei", ModelRunnerModelFormat.EdgeImpulseCompiled, agg);
        }

        protected invokeModel() {
            try {
                this.outputs = this.model.invoke(this.agg.samplesBuffer)
            } catch (e) {
                if (typeof e == "string")
                    this.lastError = e
                control.dmesgValue(e)
            }
        }

        protected eraseModel() {
            this.model = null
            binstore.erase()
        }

        protected transformFirstBlockOfModel(buf: Buffer) {
            edgeimpulse.validateAndRewriteModelHeader(buf)
            return buf
        }

        start() {
            super.start()
            //if (this.model)
            //    this.model.test()
        }

        protected loadModelImpl() {
            try {
                this.model = new edgeimpulse.Model(this.modelBuffer)
            } catch (e) {
                if (typeof e == "string")
                    this.lastError = e
                control.dmesgValue(e)
            }
        }

        get arenaBytes() {
            return 0
        }

        get inputShape(): number[] {
            return this.model.inputShape
        }

        get outputShape(): number[] {
            return this.model.outputShape
        }
    }

    //% whenUsed
    export const eiHost = new EIHost(sensorAggregatorHost)
}