import type { AppLoadContext } from "./server-runtime/data";
import type { Serializable } from "./server-runtime/single-fetch";

export type Expect<T extends true> = T;
// prettier-ignore
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends
  (<T>() => T extends Y ? 1 : 2) ? true : false
type IsAny<T> = 0 extends 1 & T ? true : false;
type IsDefined<T> = Equal<T, undefined> extends true ? false : true;
type Fn = (...args: any[]) => unknown;

type RouteModule = {
  loader?: Fn;
  clientLoader?: Fn;
  action?: Fn;
  clientAction?: Fn;
  HydrateFallback?: unknown;
  default?: unknown;
  ErrorBoundary?: unknown;
};

type VoidToUndefined<T> = Equal<T, void> extends true ? undefined : T;

// prettier-ignore
type DataFrom<T> =
  IsAny<T> extends true ? undefined :
  T extends Fn ? VoidToUndefined<Awaited<ReturnType<T>>> :
  undefined

type ServerDataFrom<T> = Serialize<DataFrom<T>>;
type ClientDataFrom<T> = DataFrom<T>;

export type CreateLoaderData<T extends RouteModule> = _CreateLoaderData<
  ServerDataFrom<T["loader"]>,
  ClientDataFrom<T["clientLoader"]>,
  false, // TODO
  IsAny<T["HydrateFallback"]> extends true ? false : true
>;

// prettier-ignore
type _CreateLoaderData<
  ServerLoaderData,
  ClientLoaderData,
  ClientLoaderHydrate extends boolean,
  HasHydrateFallback
> =
  [HasHydrateFallback, ClientLoaderHydrate]  extends [true, true] ?
    IsDefined<ClientLoaderData> extends true ? ClientLoaderData :
    undefined
  :
  [IsDefined<ClientLoaderData>, IsDefined<ServerLoaderData>] extends [true, true] ? ServerLoaderData | ClientLoaderData :
  IsDefined<ClientLoaderData> extends true ?
    ClientLoaderHydrate extends true ? ClientLoaderData :
    ClientLoaderData | undefined
  :
  IsDefined<ServerLoaderData> extends true ? ServerLoaderData :
  undefined

export type CreateActionData<T extends RouteModule> = _CreateActionData<
  ServerDataFrom<T["action"]>,
  ClientDataFrom<T["clientAction"]>
>;

// prettier-ignore
type _CreateActionData<ServerActionData, ClientActionData> = Awaited<
  [IsDefined<ServerActionData>, IsDefined<ClientActionData>] extends [true, true] ? ServerActionData | ClientActionData :
  IsDefined<ClientActionData> extends true ? ClientActionData :
  IsDefined<ServerActionData> extends true ? ServerActionData :
  undefined
>

type DataFunctionArgs<Params> = {
  request: Request;
  params: Params;
  context?: AppLoadContext;
};

// prettier-ignore
type Serialize<T> =
  // First, let type stay as-is if its already serializable...
  T extends Serializable ? T :

  // ...then don't allow functions to be serialized...
  T extends (...args: any[]) => unknown ? undefined :

  // ...lastly handle inner types for all container types allowed by `turbo-stream`

  // Promise
  T extends Promise<infer U> ? Promise<Serialize<U>> :

  // Map & Set
  T extends Map<infer K, infer V> ? Map<Serialize<K>, Serialize<V>> :
  T extends Set<infer U> ? Set<Serialize<U>> :

  // Array
  T extends [] ? [] :
  T extends readonly [infer F, ...infer R] ? [Serialize<F>, ...Serialize<R>] :
  T extends Array<infer U> ? Array<Serialize<U>> :
  T extends readonly unknown[] ? readonly Serialize<T[number]>[] :

  // Record
  T extends Record<any, any> ? {[K in keyof T]: Serialize<T[K]>} :

  undefined

export type CreateServerLoaderArgs<Params> = DataFunctionArgs<Params>;

export type CreateClientLoaderArgs<
  Params,
  T extends RouteModule
> = DataFunctionArgs<Params> & {
  serverLoader: () => Promise<ServerDataFrom<T["loader"]>>;
};

export type CreateServerActionArgs<Params> = DataFunctionArgs<Params>;

export type CreateClientActionArgs<
  Params,
  T extends RouteModule
> = DataFunctionArgs<Params> & {
  serverAction: () => Promise<ServerDataFrom<T["action"]>>;
};

export type CreateHydrateFallbackProps<Params> = {
  params: Params;
};

export type CreateDefaultProps<Params, LoaderData, ActionData> = {
  params: Params;
  loaderData: LoaderData;
  actionData?: ActionData;
};

export type CreateErrorBoundaryProps<Params, LoaderData, ActionData> = {
  params: Params;
  error: unknown;
  loaderData?: LoaderData;
  actionData?: ActionData;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type __tests = [
  // ServerDataFrom
  Expect<Equal<ServerDataFrom<any>, undefined>>,
  Expect<
    Equal<
      ServerDataFrom<() => { a: string; b: Date; c: () => boolean }>,
      { a: string; b: Date; c: undefined }
    >
  >,

  // ClientDataFrom
  Expect<Equal<ClientDataFrom<any>, undefined>>,
  Expect<
    Equal<
      ClientDataFrom<() => { a: string; b: Date; c: () => boolean }>,
      { a: string; b: Date; c: () => boolean }
    >
  >,

  // LoaderData
  Expect<Equal<CreateLoaderData<{}>, undefined>>,
  Expect<
    Equal<
      CreateLoaderData<{
        loader: () => { a: string; b: Date; c: () => boolean };
      }>,
      { a: string; b: Date; c: undefined }
    >
  >,
  Expect<
    Equal<
      CreateLoaderData<{
        clientLoader: () => { a: string; b: Date; c: () => boolean };
      }>,
      undefined | { a: string; b: Date; c: () => boolean }
    >
  >,
  Expect<
    Equal<
      CreateLoaderData<{
        loader: () => { a: string; b: Date; c: () => boolean };
        clientLoader: () => { d: string; e: Date; f: () => boolean };
      }>,
      | { a: string; b: Date; c: undefined }
      | { d: string; e: Date; f: () => boolean }
    >
  >,
  // TODO: tests w/ ClientLoaderHydrate

  // ActionData
  Expect<Equal<CreateActionData<{}>, undefined>>,
  Expect<
    Equal<
      CreateActionData<{
        action: () => { a: string; b: Date; c: () => boolean };
      }>,
      { a: string; b: Date; c: undefined }
    >
  >,
  Expect<
    Equal<
      CreateActionData<{
        clientAction: () => { a: string; b: Date; c: () => boolean };
      }>,
      { a: string; b: Date; c: () => boolean }
    >
  >,
  Expect<
    Equal<
      CreateActionData<{
        action: () => { a: string; b: Date; c: () => boolean };
        clientAction: () => { d: string; e: Date; f: () => boolean };
      }>,
      | { a: string; b: Date; c: undefined }
      | { d: string; e: Date; f: () => boolean }
    >
  >
];
