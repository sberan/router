import { createAnnotationFactory } from 'reflect-annotations'
import { RouterContext } from "./context";

const trim = (x: string) => x.replace(/^\/+|\/+$/g, ''),
  result = (x: string) => '/' + trim(x),
  upper = (x: any) => x.toString().toUpperCase()

export class RouteAnnotation {

  public path: string
  public methods: string[]
  public resolvedPaths: string[]
  public ignoreParentPrefix: boolean
  public ignoreAllPrefix: boolean

  constructor (path: string, ...methods: Array<Path | string>) {
    path = path || ''
    this.ignoreAllPrefix = path.startsWith('$')
    this.ignoreParentPrefix = path.startsWith('~')
    this.path = trim(path.replace(/^\$|^~/, '')),
    this.methods = Array.from(new Set(methods.map(upper)))
  }

  get isHttpMethodAnnotation () {
    return Boolean(this.methods.length)
  }

  get isRouteAnnotation () {
    return true
  }

  resolvePath (prefix:string, suffix?: RouteAnnotation) {
    prefix = trim(prefix)
    if (!suffix) {
      return result(this.ignoreAllPrefix ? this.path : (prefix + '/' + this.path))
    }
    if (suffix.ignoreAllPrefix) {
      return result(suffix.path)
    }
    if (suffix.ignoreParentPrefix) {
      return result(prefix + '/' + suffix.path)
    }
    return result(prefix + '/' + this.path + '/' + suffix.path)
  }
}

export type Annotation = ClassDecorator & MethodDecorator

export interface Path {
  (urlDefinition: string, ...methods: Array<Path|string>): Annotation
}

export interface Route extends Path {
  Get: Path
  Post: Path
  Put: Path
  Delete: Path
  Head: Path
  Patch: Path
}

const methods = ['Get','Post','Put','Delete','Head','Patch']

export const Route = <Route>methods.reduce((set, method) => {
  set[method] = (path: string) => set(path, method)
  set[method].toString = () => method
  return set
}, <any>createAnnotationFactory(RouteAnnotation))

export const parametersMetadataKey = Symbol('parametersMetadataKey')

export type ParamResolver = (context: RouterContext<any>) => any

function createParamResolverDecorator(resolver: ParamResolver) {
  return (target: any, propertyKey: string | symbol, parameterIndex: number) => {
    let existingParamResolvers: ParamResolver[] = Reflect.getOwnMetadata(parametersMetadataKey, target, propertyKey) || []
    existingParamResolvers[parameterIndex] = resolver
    Reflect.defineMetadata(parametersMetadataKey, existingParamResolvers, target, propertyKey)
  }
}

export const Param = {
  Body () {
    return createParamResolverDecorator((context) => context.req.body)
  },

  Route (paramName: string) {
    return createParamResolverDecorator((context) => context.req.params[paramName])
  },

  Query (paramName: string) {
    return createParamResolverDecorator((context) => context.req.query[paramName])
  },

  Header (paramName: string) {
    return createParamResolverDecorator((context) => context.req.headers[paramName])
  }
}
