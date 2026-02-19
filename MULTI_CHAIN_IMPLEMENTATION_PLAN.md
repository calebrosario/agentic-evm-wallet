# Multi-Chain Implementation Plan

**Created:** 2026-02-17
**Status:** Draft - Pending Approval
**Branch:** (detached)
**Commit:** aa67262

---

## Executive Summary

Expand Agentic EVM wallet from 2 chains (Ethereum, Polygon) to **Top 10 EVM blockchains by users/TVL**.

**Objective:** Enable wallet operations, transaction execution, and agent orchestration across multiple EVM chains with centralized chain configuration.

**Impact:**

- Support for 10 major EVM chains vs current 2
- Eliminate ~100+ lines of duplicated chain configuration code
- Type-safe chain selection across all modules
- Scalable architecture for adding new chains

---

## Current State Analysis

### Problem: Massive Duplication

Every core module duplicates chain configuration:

| Module                 | Lines of Duplication |
| ---------------------- | -------------------- |
| walletManager.ts       | ~20                  |
| gasManager.ts          | ~15                  |
| transactionBuilder.ts  | ~20                  |
| keyManager.ts          | ~15                  |
| agentManager.ts        | ~8                   |
| transactionExecutor.ts | ~20 (optional)       |
| **Total**              | **~98 lines**        |

### Current Chain Support

**Supported (hardcoded in 6 modules):**

- Ethereum (Chain ID: 1)
- Polygon (Chain ID: 137)

**No existing chain registry or central configuration.**

---

## Architecture Design

### Proposed: Centralized Chain Configuration Module

```
src/chains/
├── types.ts              # TypeScript interfaces
├── chainConfig.ts        # Main configuration module
└── registry.ts            # Chain registry helper functions
```

### Key Design Decisions

1. **Single Source of Truth:** All modules import from `src/chains/chainConfig.ts`
2. **Leverage viem/chains:** Use Viem's built-in chain exports (all 10 chains available)
3. **Custom RPC Overrides:** Support optional custom RPC via `rpcUrls?: Record<number, string>`
4. **Type Safety:** TypeScript interfaces for all chain metadata
5. **Backward Compatible:** Maintain existing `getChainConfig(chainId)` API pattern

---

## Top 10 EVM Chains to Support

| Rank | Chain             | Chain ID | Native Token | Viem Export  | Primary RPC                     | Block Explorer             | Notes |
| ---- | ----------------- | -------- | ------------ | ------------ | ------------------------------- | -------------------------- | ----- |
| 1    | Ethereum          | 1        | ETH          | ✅ mainnet   | https://etherscan.io            | #1 by TVL, most users      |
| 2    | BNB Smart Chain   | 56       | BNB          | ✅ bsc       | https://bscscan.com             | High volume, low fees      |
| 3    | Polygon           | 137      | POL          | ✅ polygon   | https://polygonscan.com         | Already supported          |
| 4    | Arbitrum One      | 42161    | ETH          | ✅ arbitrum  | https://arbiscan.io             | Popular L2                 |
| 5    | Optimism          | 10       | ETH          | ✅ optimism  | https://optimistic.etherscan.io | Popular L2                 |
| 6    | Avalanche C-Chain | 43114    | AVAX         | ✅ avalanche | https://snowtrace.io            | DeFi hub                   |
| 7    | Base              | 8453     | ETH          | ✅ base      | https://basescan.org            | Fast-growing L2 (Coinbase) |
| 8    | zkSync Era        | 324      | ETH          | ✅ zkSync    | https://era.zksync.io           | ZK-rollup                  |
| 9    | Fantom            | 250      | FTM          | ✅ fantom    | https://ftmscan.com             | Fast, low cost             |
| 10   | Gnosis            | 100      | XDAI         | ✅ gnosis    | https://gnosisscan.io           | Stablecoin focus           |

**All chains have Viem exports - no custom chain definitions needed.**

---

## Implementation Tasks

### Phase 1: Create Chain Configuration Module

#### Task 1.1: Create chain types

**File:** `src/chains/types.ts`
**Priority:** Critical (Blocks all other work)
**Estimated Time:** 30 minutes

**Deliverables:**

```typescript
// TypeScript interfaces for chain metadata
export interface ChainConfig {
  id: number;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorer: string;
  rpcUrls: {
    default: string[];
    public: string[];
  };
}

export type SupportedChainId =
  | 1 // Ethereum
  | 56 // BNB Smart Chain
  | 137 // Polygon
  | 42161 // Arbitrum One
  | 10 // Optimism
  | 43114 // Avalanche C-Chain
  | 8453 // Base
  | 324 // zkSync Era
  | 250 // Fantom
  | 100; // Gnosis
```

#### Task 1.2: Create main chain configuration

**File:** `src/chains/chainConfig.ts`
**Priority:** Critical (Blocks all other work)
**Estimated Time:** 1 hour

**Deliverables:**

- Import all 10 chains from `viem/chains`
- Create centralized `Map<number, Chain>` with all chains
- Export `getChain(chainId: SupportedChainId): Chain`
- Export `getAllChains(): Map<number, Chain>`
- Export `getSupportedChainIds(): SupportedChainId[]`
- Custom RPC override support

#### Task 1.3: Create registry helper

**File:** `src/chains/registry.ts`
**Priority:** High
**Estimated Time:** 30 minutes

**Deliverables:**

- `validateChainId(chainId: number): boolean`
- `isChainSupported(chainId: number): boolean`
- `getChainMetadata(chainId: number): ChainConfig`
- Helper functions for chain-specific operations

---

### Phase 2: Update Core Modules

#### Task 2.1: Update WalletManager

**File:** `src/wallet/walletManager.ts`
**Priority:** Critical
**Estimated Time:** 1 hour

**Changes:**

- Remove: `private readonly chains: Map<number, Chain>` initialization
- Remove: `import { mainnet, polygon } from "viem/chains"`
- Import: `import { getChain } from "../chains/chainConfig"`
- Update: All `this.getChainConfig(chainId)` calls to use centralized function
- Update: Error message to list all 10 chains instead of 2
- Keep: `chainId` validation logic (maintains backward compatibility)
- Test: Verify wallet creation/import for all 10 chains

#### Task 2.2: Update GasManager

**File:** `src/gas/gasManager.ts`
**Priority:** High
**Estimated Time:** 45 minutes

**Changes:**

- Remove: `private readonly chains: Map<number, Chain>` initialization
- Remove: `import { mainnet, polygon } from "viem/chains"`
- Import: `import { getChain } from "../chains/chainConfig"`
- Update: All `this.getChainConfig(chainId)` calls
- Test: Gas estimation for all 10 chains

#### Task 2.3: Update TransactionBuilder

**File:** `src/transactions/transactionBuilder.ts`
**Priority:** High
**Estimated Time:** 45 minutes

**Changes:**

- Remove: `private readonly chains: Map<number, Chain>` initialization
- Remove: `import { mainnet, polygon } from "viem/chains"`
- Import: `import { getChain } from "../chains/chainConfig"`
- Update: All `this.getChainConfig(chainId)` calls
- Test: Transaction building for all 10 chains

#### Task 2.4: Update KeyManager

**File:** `src/key/keyManager.ts`
**Priority:** High
**Estimated Time:** 45 minutes

**Changes:**

- Remove: `private readonly chains: Map<number, Chain>` initialization
- Remove: `import { mainnet, polygon } from "viem/chains"`
- Import: `import { getChain } from "../chains/chainConfig"`
- Update: All `this.getChainConfig(chainId)` calls
- Test: Key operations for all 10 chains

#### Task 2.5: Update AgentManager

**File:** `src/agent/agentManager.ts`
**Priority:** High
**Estimated Time:** 30 minutes

**Changes:**

- Remove: `private chains: Map<number, Chain>` initialization
- Remove: `import { mainnet, polygon } from "viem/chains"`
- Import: `import { getChain } from "../chains/chainConfig"`
- Update: Chain map initialization
- Test: Agent operations across chains

#### Task 2.6: Update TransactionExecutor

**File:** `src/execution/transactionExecutor.ts`
**Priority:** Medium (already supports optional chains)
**Estimated Time:** 30 minutes

**Changes:**

- Keep: Existing `options.chains?: Map<number, Chain>` support (backward compatible)
- Update: Error message in `getChainConfig()` to list all 10 chains
- Document: Custom chain support via `chains` parameter
- Test: Transaction execution across chains

#### Task 2.7: Update type definitions

**File:** `src/execution/types.ts`
**Priority:** Low (documentation only)
**Estimated Time:** 15 minutes

**Changes:**

- Update: JSDoc comments for `chains?: Map<number, Chain>` to reference centralized config
- Update: JSDoc for `rpcUrls?: Record<number, string>` to document custom RPC support

---

### Phase 3: Update Path Aliases

#### Task 3.1: Update tsconfig.json paths

**File:** `tsconfig.json`
**Priority:** Medium
**Estimated Time:** 5 minutes

**Changes:**

- Add: `"@/chains/*": ["./src/chains/*"]` path alias

---

### Phase 4: Testing

#### Task 4.1: Create chain configuration tests

**File:** `tests/unit/chains/chainConfig.test.ts`
**Priority:** High
**Estimated Time:** 1 hour

**Test Cases:**

- [ ] `getChain()` returns correct Chain for all 10 chain IDs
- [ ] `getChain()` throws for invalid chain ID
- [ ] `getAllChains()` returns all 10 chains
- [ ] `getSupportedChainIds()` returns array of 10 chain IDs
- [ ] `validateChainId()` works for valid chains
- [ ] `validateChainId()` rejects invalid chains
- [ ] Chain properties match Viem exports (id, name, rpcUrls)

#### Task 4.2: Update existing tests

**Files:** All `*.test.ts` files
**Priority:** High
**Estimated Time:** 2 hours

**Test Updates:**

- Update: WalletManager tests to test chain ID 56, 42161, 10, 43114, 8453, 324, 250, 100
- Update: GasManager tests for multi-chain gas estimation
- Update: TransactionBuilder tests for chain-specific building
- Update: KeyManager tests for key operations across chains
- Update: AgentManager tests for cross-chain agent operations
- Update: TransactionExecutor tests for multi-chain execution

#### Task 4.3: Integration tests

**File:** `tests/integration/multi-chain.test.ts`
**Priority:** Medium
**Estimated Time:** 1 hour

**Test Cases:**

- [ ] Create wallet on chain A, create wallet on chain B (isolation)
- [ ] Execute transaction on Ethereum, verify on Polygon (chain isolation)
- [ ] Gas estimation varies by chain
- [ ] Custom RPC override works

---

### Phase 5: Documentation

#### Task 5.1: Update AGENTS.md

**File:** `AGENTS.md` (root)
**Priority:** Medium
**Estimated Time:** 30 minutes

**Changes:**

- Update: "Supported chains" section to list all 10 chains
- Update: "WHERE TO LOOK" table to reference chain configuration module

#### Task 5.2: Create CHAINS.md

**File:** `docs/CHAINS.md`
**Priority:** Low
**Estimated Time:** 30 minutes

**Content:**

- Complete table of supported chains with details
- Examples of using each chain
- Notes on chain-specific considerations

---

## Implementation Phases Summary

| Phase                  | Tasks                   | Estimated Time | Dependencies |
| ---------------------- | ----------------------- | -------------- | ------------ |
| 1: Chain Config Module | 3 tasks (~2 hours)      | None           |
| 2: Update Core Modules | 7 tasks (~4.5 hours)    | Phase 1        |
| 3: Path Aliases        | 1 task (~5 min)         | Phase 2        |
| 4: Testing             | 3 tasks (~4 hours)      | Phase 2        |
| 5: Documentation       | 2 tasks (~1 hour)       | Phase 4        |
| **Total**              | **16 tasks (~8 hours)** | **Sequential** |

**Can parallelize:** Phase 2.1-2.7 can be done simultaneously (different developers/agents)
**Estimated parallel time:** ~4 hours

---

## Risk Assessment

### High Risks

| Risk                          | Impact                                            | Mitigation                                                             |
| ----------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------- |
| Breaking existing tests       | Test suite fails after module update              | Run full test suite after each module update, fix failures immediately |
| Type errors from Viem imports | Some chains may not have perfect TypeScript types | Use `as Chain` casting, run typecheck after changes                    |
| RPC endpoint failures         | Public RPCs may be unreliable                     | Document custom RPC override option, recommend reliable RPC providers  |
| Gas estimation differences    | Chains have different gas patterns                | Test gas estimation on each chain, document chain-specific defaults    |

### Medium Risks

| Risk                   | Impact                        | Mitigation                                                    |
| ---------------------- | ----------------------------- | ------------------------------------------------------------- |
| Performance regression | More chain lookups = slower   | Profile before/after, consider caching frequent chain lookups |
| Increased bundle size  | Importing 10 chains vs 2      | Bundle size increase minimal (Viem chains are tree-shakeable) |
| Chain deprecation      | Some chains may be deprecated | Document deprecation status, monitor viem updates             |

### Low Risks

| Risk              | Impact                                 | Mitigation                                              |
| ----------------- | -------------------------------------- | ------------------------------------------------------- |
| Documentation lag | New chains not documented in AGENTS.md | Update documentation in Phase 5                         |
| Edge case bugs    | Unusual chain IDs or behaviors         | Add tests for edge cases (invalid IDs, chain switching) |

---

## Success Criteria

### Phase Completion Criteria

- [ ] **Phase 1:** All 3 tasks complete, no TypeScript errors
- [ ] **Phase 2:** All 6 modules updated, `bun test` passes for updated modules
- [ ] **Phase 3:** Path aliases added, `bun run typecheck` passes
- [ ] **Phase 4:** All tests pass (90%+ coverage maintained)
- [ ] **Phase 5:** Documentation updated, AGENTS.md reflects all 10 chains

### Overall Success Criteria

- [ ] Wallet can be created on all 10 chains
- [ ] Transactions can be executed on all 10 chains
- [ ] Gas estimation works on all 10 chains
- [ ] No duplicated chain configuration code
- [ ] All existing tests pass
- [ ] New tests added for chain configuration
- [ ] Documentation updated
- [ ] No TypeScript errors (`bun run typecheck` passes)
- [ ] No lint errors (`bun run lint` passes)
- [ ] Build succeeds (`bun run build` passes)

---

## Next Steps (After Approval)

1. Start with Phase 1 (chain config module) - foundation for everything else
2. Update modules sequentially (WalletManager first, as it's most critical)
3. Run tests after each module update
4. Create git commits after each successful module update
5. Update documentation at the end
6. Run full test suite and fix any failures
7. Create pull request with description of changes

---

## Questions / Decisions Needed

### For User

1. **Priority:** Should we add testnets (Sepolia, Amoy, etc.) in addition to mainnets?
   - Option A: Only mainnets (recommended for production wallet)
   - Option B: Include testnets for development

2. **RPC Strategy:** Should we bundle custom RPC URLs or only use Viem defaults?
   - Option A: Use Viem defaults only (simpler)
   - Option B: Bundle reliable public RPCs (more control)

3. **Chain Selection UI:** Should we add helper functions for chain selection?
   - Example: `getChainBySymbol('ETH')`, `getChainByName('Ethereum')`
   - Option A: Yes, add convenience helpers
   - Option B: No, keep minimal API

4. **Deprecation Policy:** How to handle deprecated chains?
   - Option A: Warn but support
   - Option B: Remove deprecated chains

### For Implementation

1. **Module Order:** Should we update modules in dependency order or alphabetical?
   - Recommendation: Update in this order: gasManager → keyManager → walletManager → transactionBuilder → agentManager → transactionExecutor
   - Reason: Minimizes circular dependencies

2. **Testing:** Should we test each module individually or together?
   - Recommendation: Test each module immediately after update, then full integration tests

---

## Notes

- All chains selected have official Viem exports - no custom chain definitions needed
- Viem's `viem/chains` module exports all these chains with proper TypeScript types
- Using Viem chains ensures we get chain-native properties (rpcUrls, blockExplorers, fees)
- `getChainConfig(chainId)` pattern is already well-established across codebase
- The architecture maintains backward compatibility with existing code patterns
- Error messages need to be updated to list all 10 supported chains instead of 2

---

**End of Plan**
