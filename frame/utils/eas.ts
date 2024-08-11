import { EAS } from '@ethereum-attestation-service/eas-sdk'
import type {
  Attestation,
  AttestationResult,
  EASChainConfig,
  EnsNamesResult,
  MyAttestationResult,
} from './types'
import { CUSTOM_SCHEMAS } from './constants'
import invariant from 'tiny-invariant';

function getChainId() {
  return Number(process.env.CHAIN_ID);
}

export const CHAINID = getChainId();
invariant(CHAINID, "No chain ID env found");

export const EAS_CHAIN_CONFIGS: EASChainConfig[] = [
  {
    chainId: 84532,
    chainName: "base-sepolia",
    subdomain: "base-sepolia.",
    version: "1.2.0",
    contractAddress: "0x4200000000000000000000000000000000000021",
    schemaRegistryAddress: "0x4200000000000000000000000000000000000020",
    etherscanURL: "https://sepolia.basescan.org",
    contractStartBlock: 0,
    rpcProvider: `https://base-sepolia.g.alchemy.com/v2/`,
  },
  {
    chainId: 11155420,
    chainName: "optimism-sepolia",
    subdomain: "optimism-sepolia.",
    version: "1.2.0",
    contractAddress: "0x4200000000000000000000000000000000000021",
    schemaRegistryAddress: "0x4200000000000000000000000000000000000020",
    etherscanURL: "https://optimism-sepolia.blockscout.com",
    contractStartBlock: 0,
    rpcProvider: `https://opt-sepolia.g.alchemy.com/v2/`,
  },
  {
    chainId: 11155111,
    chainName: 'sepolia',
    subdomain: 'sepolia.',
    version: '0.26',
    contractAddress: '0x4200000000000000000000000000000000000021',
    schemaRegistryAddress: '0x4200000000000000000000000000000000000020',
    etherscanURL: 'https://base-sepolia.etherscan.io',
    contractStartBlock: 2958570,
    rpcProvider: 'https://base-sepolia.infura.io/v3/',
  },
] as const

export const activeChainConfig = EAS_CHAIN_CONFIGS.find(
  (config) => config.chainId === CHAINID
);

export const eas=new EAS(activeChainConfig!.contractAddress)


async function request<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch(
    `https://${activeChainConfig!.subdomain}easscan.org/graphql`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  )

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const json = await response.json()
  return json
}

export async function getAttestation(uid: string): Promise<Attestation | null> {
  const response = await request<AttestationResult>({
    query:
      'query Query($where: AttestationWhereUniqueInput!) {\n  attestation(where: $where) {\n    id\n    attester\n    recipient\n    revocationTime\n    expirationTime\n    time\n    txid\n    data\n  }\n}',
    variables: {
      where: {
        id: uid,
      },
    },
  })

  console.log(`getAttestation(${uid})`, response)

  return response.data.attestation
}
export async function getAttestationsForAddress(address: string) {
  const response = await request<MyAttestationResult>({
    query:
      'query Attestations($where: AttestationWhereInput, $orderBy: [AttestationOrderByWithRelationInput!]) {\n  attestations(where: $where, orderBy: $orderBy) {\n    attester\n    revocationTime\n    expirationTime\n    time\n    recipient\n    id\n    data\n  }\n}',

    variables: {
      where: {
        schemaId: {
          equals: CUSTOM_SCHEMAS.IS_A_PARTNER_SCHEMA,
        },
        OR: [
          {
            attester: {
              equals: address,
            },
          },
          {
            recipient: {
              equals: address,
            },
          },
        ],
      },
      orderBy: [
        {
          time: 'desc',
        },
      ],
    },
  })
  return response.data.attestations
}
export async function getConfirmationAttestationsForUIDs(refUids: string[]) {
  const response = await request<MyAttestationResult>({
    query:
      'query Attestations($where: AttestationWhereInput, $orderBy: [AttestationOrderByWithRelationInput!]) {\n  attestations(where: $where, orderBy: $orderBy) {\n    attester\n    revocationTime\n    expirationTime\n    time\n    recipient\n    id\n    data\n  refUID\n  }\n}',

    variables: {
      where: {
        schemaId: {
          equals: CUSTOM_SCHEMAS.CONFIRM_SCHEMA,
        },
        refUID: {
          in: refUids,
        },
      },
      orderBy: [
        {
          time: 'desc',
        },
      ],
    },
  })
  return response.data.attestations
}
export async function getENSNames(addresses: string[]) {
  const response = await request<EnsNamesResult>({
    query:
      'query Query($where: EnsNameWhereInput) {\n  ensNames(where: $where) {\n    id\n    name\n  }\n}',
    variables: {
      where: {
        id: {
          in: addresses,
          mode: 'insensitive',
        },
      },
    },
  })
  return response.data.ensNames
}
