/*
This file is part of web3.js.

web3.js is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

web3.js is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with web3.js.  If not, see <http://www.gnu.org/licenses/>.
*/
import 'web3';
import { Web3Context, Web3PluginBase } from 'web3-core';
import { ContractAbi } from 'web3-eth-abi';
import Contract from 'web3-eth-contract';
import { Address, Numbers } from 'web3-types';
import { DataFormat, DEFAULT_RETURN_FORMAT, format, numberToHex } from 'web3-utils';

import { ERC20TokenAbi } from './ERC20Token';

export class ContractMethodWrappersPlugin extends Web3PluginBase {
	public pluginNamespace = 'contractMethodWrappersPlugin';

	// This should be private, but it's public so _contract.requestManager.send can
	// be mocked in contract_method_wrappers.test.ts
	public readonly _contract: Contract<typeof ERC20TokenAbi>;

	public constructor(abi: ContractAbi, address: Address) {
		super();
		this._contract = new Contract(abi, address);
	}

	/**
	 * This method overrides the inherited `link` method from `Web3PluginBase`
	 * to add to a configured `RequestManager` to our Contract instance
	 * when `Web3.registerPlugin` is called.
	 *
	 * @param parentContext - The context to be added to the instance of `ChainlinkPlugin`,
	 * and by extension, the instance of `Contract`.
	 */
	public link(parentContext: Web3Context) {
		super.link(parentContext);
		this._contract.link(parentContext);
	}

	public async getFormattedBalance<ReturnFormat extends DataFormat>(
		address: Address,
		returnFormat: ReturnFormat,
	) {
		return format(
			{ eth: 'unit' },
			await this._contract.methods.balanceOf(address).call(),
			returnFormat,
		);
	}

	public async transferAndGetBalances<ReturnFormat extends DataFormat>(
		sender: Address,
		recipient: Address,
		amount: Numbers,
		returnFormat?: ReturnFormat,
	) {
		await this._contract.methods
			.transfer(recipient, numberToHex(amount))
			.send({ from: sender });
		return {
			sender: {
				address: sender,
				balance: await this.getFormattedBalance(
					sender,
					returnFormat ?? DEFAULT_RETURN_FORMAT,
				),
			},
			recipient: {
				address: recipient,
				balance: await this.getFormattedBalance(
					recipient,
					returnFormat ?? DEFAULT_RETURN_FORMAT,
				),
			},
		};
	}
}

declare module 'web3' {
	interface Web3 {
		contractMethodWrappersPlugin: ContractMethodWrappersPlugin;
	}
}