'use strict';

const TARGET_REPOSITORY = 'CosmosContracts/juno-std';
const EVENT_TYPE = 'juno-release';

function booleanInput(value) {
  return value === true || String(value).toLowerCase() === 'true';
}

// Apply Git's ref-name restrictions without invoking git, so payload construction is
// deterministic and can be tested without network access or a repository dispatch.
function validateReleaseTag(tag) {
  if (typeof tag !== 'string' || tag.length === 0) {
    throw new Error('Unable to determine release tag');
  }

  const components = tag.split('/');
  const invalid = components.some((component) => component.length === 0
      || component.startsWith('.')
      || component.endsWith('.lock'))
    || tag.endsWith('.')
    || tag.includes('..')
    || tag.includes('@{')
    || /[\x00-\x20\x7f~^:?*[\\]/.test(tag);
  if (invalid) {
    throw new Error(`Invalid release tag: '${tag}'`);
  }

  return tag;
}

function requiredEnv(env, name) {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function buildDispatchRequest(payload, env) {
  const release = payload && payload.release;
  const inputs = (payload && payload.inputs) || {};
  const releaseTag = validateReleaseTag(release ? release.tag_name : inputs.release_tag);
  const isDraft = release ? Boolean(release.draft) : booleanInput(inputs.is_draft);
  const isPrerelease = release ? Boolean(release.prerelease) : booleanInput(inputs.is_prerelease);
  const [owner, repo] = TARGET_REPOSITORY.split('/');

  const repos = {
    juno: {
      name: 'juno',
      repo: requiredEnv(env, 'JUNO_REPO'),
      rev: releaseTag,
      dir: requiredEnv(env, 'JUNO_DIR'),
      exclude_mods: [],
    },
    cosmos_sdk: {
      name: 'cosmos',
      repo: requiredEnv(env, 'COSMOS_SDK_REPO'),
      rev: requiredEnv(env, 'COSMOS_SDK_REV'),
      dir: requiredEnv(env, 'COSMOS_SDK_DIR'),
      exclude_mods: ['cosmos/benchmark', 'cosmos/counter', 'cosmos/epochs', 'cosmos/protocolpool'],
    },
    wasmd: {
      name: 'wasm',
      repo: requiredEnv(env, 'WASMD_REPO'),
      rev: requiredEnv(env, 'WASMD_REV'),
      dir: requiredEnv(env, 'WASMD_DIR'),
      exclude_mods: [],
    },
    cometbft: {
      name: 'cometbft',
      repo: requiredEnv(env, 'COMETBFT_REPO'),
      rev: requiredEnv(env, 'COMETBFT_REV'),
      dir: requiredEnv(env, 'COMETBFT_DIR'),
      exclude_mods: [],
    },
    ibc_go: {
      name: 'ibc-go',
      repo: requiredEnv(env, 'IBC_GO_REPO'),
      rev: requiredEnv(env, 'IBC_GO_REV'),
      dir: requiredEnv(env, 'IBC_GO_DIR'),
      exclude_mods: [],
    },
    ics23: {
      name: 'ics23',
      repo: requiredEnv(env, 'ICS23_REPO'),
      rev: requiredEnv(env, 'ICS23_REV'),
      dir: requiredEnv(env, 'ICS23_DIR'),
      exclude_mods: [],
    },
  };

  return {
    owner,
    repo,
    event_type: EVENT_TYPE,
    client_payload: {
      is_draft: isDraft,
      is_prerelease: isPrerelease,
      release_tag: releaseTag,
      repos,
    },
  };
}

module.exports = { buildDispatchRequest, validateReleaseTag };
