import dns from "node:dns";
import { Agent, fetch as undiciFetch } from "undici";

type LookupCallback = (
  err: NodeJS.ErrnoException | null,
  addresses?: { address: string; family: 4 | 6 }[],
) => void;

function resilientLookup(
  hostname: string,
  _options: unknown,
  callback: LookupCallback,
): void {
  dns.resolve4(hostname, (err4, addrs4) => {
    if (!err4 && addrs4 && addrs4.length > 0) {
      callback(
        null,
        addrs4.map((a) => ({ address: a, family: 4 as const })),
      );
      return;
    }
    dns.resolve6(hostname, (err6, addrs6) => {
      if (!err6 && addrs6 && addrs6.length > 0) {
        callback(
          null,
          addrs6.map((a) => ({ address: a, family: 6 as const })),
        );
        return;
      }
      dns.lookup(
        hostname,
        { all: true },
        (errSys, sysAddrs) => {
          if (!errSys && sysAddrs && sysAddrs.length > 0) {
            callback(
              null,
              sysAddrs.map((a) => ({
                address: a.address,
                family: a.family as 4 | 6,
              })),
            );
            return;
          }
          callback(err4 ?? err6 ?? errSys);
        },
      );
    });
  });
}

const agent = new Agent({
  connect: {
    lookup: resilientLookup as never,
    timeout: 15000,
  },
  connectTimeout: 15000,
  bodyTimeout: 30000,
  headersTimeout: 15000,
});

export function resilientFetch(
  url: string,
  init?: RequestInit & { signal?: AbortSignal },
): Promise<Response> {
  return undiciFetch(url, {
    ...(init as Parameters<typeof undiciFetch>[1]),
    dispatcher: agent,
  }) as unknown as Promise<Response>;
}
