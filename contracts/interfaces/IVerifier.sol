// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

interface IVerifier {
    struct G1Point {
        uint X;
        uint Y;
    }
    // Encoding of field elements is: X[0] * z + X[1]
    struct G2Point {
        uint[2] X;
        uint[2] Y;
    }

    struct Proof {
        G1Point a;
        G2Point b;
        G1Point c;
    }

    function verifyTx(
        Proof memory proof,
        uint[2] memory input
    ) external view returns (bool r);
}
