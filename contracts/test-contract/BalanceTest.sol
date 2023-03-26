// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

contract BalanceTest {
    address[2] public balances;

    function addBalance(address _chel) public returns (address) {
        balances[0] = _chel;
        return msg.sender;
    }

    function getBalance() public view returns (address[2] memory) {
        return balances;
    }
}
