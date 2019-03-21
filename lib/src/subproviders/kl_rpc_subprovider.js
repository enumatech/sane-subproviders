"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("@0xproject/types");
const JsonRpcError = require("json-rpc-error");
const RP = require("request-promise-native");
const utils_1 = require("../utils");
const subprovider_1 = require("./subprovider");
/**
 * This class implements the [web3-provider-engine](https://github.com/MetaMask/provider-engine) subprovider interface.
 * It forwards on JSON RPC requests to the supplied `rpcUrl` endpoint
 */
class KeepAliveRPCSubprovider extends subprovider_1.Subprovider {
    constructor(rpcUrl, requestTimeoutMs = 20000) {
        super();
        utils_1.utils.assertString(rpcUrl);
        utils_1.utils.assertNumber(requestTimeoutMs);
        this._rpcUrl = rpcUrl;
        this._requestTimeoutMs = requestTimeoutMs;
    }
    /**
     * This method conforms to the web3-provider-engine interface.
     * It is called internally byover the ProviderEngine when it is this subproviders
     * turn to handle a JSON RPC request.
     * @param payload JSON RPC payload
     * @param next Callback to call if this subprovider decides not to handle the request
     * @param end Callback to call if subprovider handled the request and wants to pass back the request.
     */
    // tslint:disable-next-line:prefer-function-over-method async-suffix
    async handleRequest(payload, _next, end) {
        const finalPayload = subprovider_1.Subprovider._createFinalPayload(payload);
        const headers = {
            Accept: 'application/json',
            'Content-Type': 'application/json'
        };
        let text;
        try {
            text = await RP({
                method: 'POST',
                body: JSON.stringify(finalPayload),
                url: this._rpcUrl,
                forever: true,
                headers: headers
            });
        }
        catch (error) {
            const statusCode = error.statusCode;
            switch (statusCode) {
                case types_1.StatusCodes.MethodNotAllowed:
                    end(new JsonRpcError.MethodNotFound());
                    return;
                case types_1.StatusCodes.GatewayTimeout:
                    const errMsg = 'Gateway timeout. The request took too long to process. This can happen when querying logs over too wide a block range.';
                    const err = new Error(errMsg);
                    end(new JsonRpcError.InternalError(err));
                    return;
                default:
                    end(new JsonRpcError.InternalError(error));
                    return;
            }
        }
        let data;
        try {
            data = JSON.parse(text);
        }
        catch (err) {
            end(new JsonRpcError.InternalError(err));
            return;
        }
        if (data.error) {
            end(new Error(data.error.message));
            return;
        }
        end(null, data.result);
    }
}
exports.KeepAliveRPCSubprovider = KeepAliveRPCSubprovider;
//# sourceMappingURL=kl_rpc_subprovider.js.map