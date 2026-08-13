'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { buildDispatchRequest } = require('./release-dispatch');

const root = path.resolve(__dirname, '../..');
const workflowPath = path.join(root, '.github/workflows/release-dispatch.yml');
const workflow = fs.readFileSync(workflowPath, 'utf8');

const dependencyEnv = {
  JUNO_REPO: 'https://github.com/CosmosContracts/juno.git',
  JUNO_DIR: 'proto',
  COSMOS_SDK_REPO: 'https://github.com/cosmos/cosmos-sdk.git',
  COSMOS_SDK_REV: 'v0.53.7',
  COSMOS_SDK_DIR: 'proto',
  WASMD_REPO: 'https://github.com/CosmWasm/wasmd.git',
  WASMD_REV: 'v0.61.11',
  WASMD_DIR: 'proto',
  COMETBFT_REPO: 'https://github.com/cometbft/cometbft.git',
  COMETBFT_REV: 'v0.38.23',
  COMETBFT_DIR: 'proto',
  IBC_GO_REPO: 'https://github.com/cosmos/ibc-go.git',
  IBC_GO_REV: 'v10.6.0',
  IBC_GO_DIR: 'proto',
  ICS23_REPO: 'https://github.com/cosmos/ics23.git',
  ICS23_REV: 'go/v0.11.0',
  ICS23_DIR: 'proto',
};

function request(payload) {
  return buildDispatchRequest(payload, dependencyEnv);
}

test('builds a payload from a released event', () => {
  const result = request({
    action: 'released',
    release: { tag_name: 'v31.0.0', draft: false, prerelease: false },
  });

  assert.equal(result.owner, 'CosmosContracts');
  assert.equal(result.repo, 'juno-std');
  assert.equal(result.event_type, 'juno-release');
  assert.deepEqual(result.client_payload, {
    is_draft: false,
    is_prerelease: false,
    release_tag: 'v31.0.0',
    repos: {
      juno: {
        name: 'juno', repo: dependencyEnv.JUNO_REPO, rev: 'v31.0.0', dir: 'proto', exclude_mods: [],
      },
      cosmos_sdk: {
        name: 'cosmos', repo: dependencyEnv.COSMOS_SDK_REPO, rev: 'v0.53.7', dir: 'proto',
        exclude_mods: ['cosmos/benchmark', 'cosmos/counter', 'cosmos/epochs', 'cosmos/protocolpool'],
      },
      wasmd: {
        name: 'wasm', repo: dependencyEnv.WASMD_REPO, rev: 'v0.61.11', dir: 'proto', exclude_mods: [],
      },
      cometbft: {
        name: 'cometbft', repo: dependencyEnv.COMETBFT_REPO, rev: 'v0.38.23', dir: 'proto', exclude_mods: [],
      },
      ibc_go: {
        name: 'ibc-go', repo: dependencyEnv.IBC_GO_REPO, rev: 'v10.6.0', dir: 'proto', exclude_mods: [],
      },
      ics23: {
        name: 'ics23', repo: dependencyEnv.ICS23_REPO, rev: 'go/v0.11.0', dir: 'proto', exclude_mods: [],
      },
    },
  });
});

test('preserves prerelease flags from a release event', () => {
  const result = request({
    action: 'prereleased',
    release: { tag_name: 'v31.0.0-rc.1', draft: false, prerelease: true },
  });

  assert.equal(result.client_payload.release_tag, 'v31.0.0-rc.1');
  assert.equal(result.client_payload.is_draft, false);
  assert.equal(result.client_payload.is_prerelease, true);
});

test('supports a recoverable manual dispatch', () => {
  const result = request({
    inputs: { release_tag: 'v31.0.0-rc.2', is_draft: 'true', is_prerelease: false },
  });

  assert.equal(result.client_payload.release_tag, 'v31.0.0-rc.2');
  assert.equal(result.client_payload.is_draft, true);
  assert.equal(result.client_payload.is_prerelease, false);
});

test('release fields take precedence over inputs', () => {
  const result = request({
    release: { tag_name: 'v31.0.0', draft: false, prerelease: false },
    inputs: { release_tag: 'wrong', is_draft: 'true', is_prerelease: 'true' },
  });

  assert.equal(result.client_payload.release_tag, 'v31.0.0');
  assert.equal(result.client_payload.is_draft, false);
  assert.equal(result.client_payload.is_prerelease, false);
});

test('rejects missing and invalid release tags before building a request', () => {
  for (const release_tag of ['', 'bad tag', '../v31', 'foo/.bar', 'foo//bar', 'v31~1', 'v31.lock']) {
    assert.throws(
      () => request({ inputs: { release_tag } }),
      /release tag/i,
      `expected ${JSON.stringify(release_tag)} to fail`,
    );
  }
});

test('workflow exposes manual recovery inputs and handles release events', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /release_tag:\s*\n\s+description:.*\n\s+required: true/);
  assert.match(workflow, /is_draft:/);
  assert.match(workflow, /is_prerelease:/);
  assert.match(workflow, /types: \[released, prereleased\]/);
});

test('workflow dependency revisions track the selected v31 Go dependency graph', () => {
  const goMod = fs.readFileSync(path.join(root, 'go.mod'), 'utf8');
  const moduleVersions = new Map(
    [...goMod.matchAll(/^\s*(\S+)\s+(v\S+)(?:\s+\/\/.*)?$/gm)].map((match) => [match[1], match[2]]),
  );
  const expected = {
    COSMOS_SDK_REV: moduleVersions.get('github.com/cosmos/cosmos-sdk'),
    WASMD_REV: moduleVersions.get('github.com/CosmWasm/wasmd'),
    COMETBFT_REV: moduleVersions.get('github.com/cometbft/cometbft'),
    IBC_GO_REV: moduleVersions.get('github.com/cosmos/ibc-go/v10'),
    ICS23_REV: `go/${moduleVersions.get('github.com/cosmos/ics23/go')}`,
  };

  for (const [name, revision] of Object.entries(expected)) {
    assert.ok(revision && !revision.includes('undefined'), `${name} dependency must exist in go.mod`);
    assert.match(workflow, new RegExp(`${name}: ["']?${revision.replaceAll('.', '\\.')}["']?`));
  }
});

test('offline payload builder cannot perform a dispatch', () => {
  const builder = fs.readFileSync(path.join(__dirname, 'release-dispatch.js'), 'utf8');
  assert.doesNotMatch(builder, /createDispatchEvent/);
});
