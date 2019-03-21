import { StatusCodes } from '@0xproject/types';
import { JSONRPCRequestPayload } from 'ethereum-types';
import JsonRpcError = require('json-rpc-error');
import RP = require('request-promise-native')
import { Callback, ErrorCallback } from '../types';
import { utils } from '../utils';

import { Subprovider } from './subprovider';

/**
 * This class implements the [web3-provider-engine](https://github.com/MetaMask/provider-engine) subprovider interface.
 * It forwards on JSON RPC requests to the supplied `rpcUrl` endpoint
 */
export class KeepAliveRPCSubprovider extends Subprovider {
    private readonly _rpcUrl: string;
    private readonly _requestTimeoutMs: number;
    constructor(rpcUrl: string, requestTimeoutMs: number = 20000) {
        super();
        utils.assertString(rpcUrl);
        utils.assertNumber(requestTimeoutMs);
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
    public async handleRequest(payload: JSONRPCRequestPayload, _next: Callback, end: ErrorCallback): Promise<void> {
        const finalPayload = Subprovider._createFinalPayload(payload);

        const headers = {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        };

        let text;
        try {
            text = await RP({
              method:'POST',
              body: JSON.stringify(finalPayload),
              url: this._rpcUrl,
              forever: true,
              headers: headers
            });
        } catch (error) {
          const statusCode = error.statusCode;
          switch (statusCode) {
              case StatusCodes.MethodNotAllowed:
                  end(new JsonRpcError.MethodNotFound());
                  return;
              case StatusCodes.GatewayTimeout:
                  const errMsg =
                      'Gateway timeout. The request took too long to process. This can happen when querying logs over too wide a block range.';
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
        } catch (err) {
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
