import { describe, test, expect, beforeEach } from "bun:test";
import { TransactionExecutor } from "../../../src/execution/transactionExecutor";
import { KeyManager } from "../../../src/key/keyManager";
import type { TransactionRequest } from "viem";
import { ErrorCode, TransactionStatus } from "../../../src/execution/types";
import {
  createMockPublicClient,
  createMockWalletClient,
  createRpcSpy
} from "../../mocks/viem-client";

describe("TransactionExecutor", () => {
  let mockKeyManager: KeyManager;
  let mockPublicClient: any;
  let mockWalletClient: any;
  let rpcSpy: any;

  const mockKey = {
    keyId: "1:0x1234567890123456789012345678901234567890",
    privateKey: ("0x" + "1".repeat(64)) as `0x${string}`,
    address: "0x1234567890123456789012345678901234567890" as `0x${string}`,
    chainId: 1
  };

  const mockTransaction: TransactionRequest = {
    to: "0x1234567890123456789012345678901234567890" as `0x${string}`,
    value: 1000000000000000000n,
    data: "0x" as `0x${string}`,
    gas: 21000n,
    gasPrice: 20000000000n
  };

    beforeEach(() => {
      rpcSpy = createRpcSpy();
      mockPublicClient = createMockPublicClient();
      mockWalletClient = createMockWalletClient(mockKey.address);
      
      mockKeyManager = {
        exportKey: async (keyId) => {
          if (keyId === mockKey.keyId) {
            return mockKey.privateKey;
          }
          throw new Error("Key not found");
        },
        getKey: (address, chainId) => {
          const keyId = `${chainId}:${address}`;
          if (keyId === mockKey.keyId) {
            return mockKey;
          }
          return undefined;
        }
      } as unknown as KeyManager;

      executor = new TransactionExecutor({
        keyManager: mockKeyManager
      });
    });
  });

  describe("executeTransaction with mocked viem client", () => {
