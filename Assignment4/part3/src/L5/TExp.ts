/*
;; Type language
;; <texp>         ::= <atomic-te> | <compound-te> | <tvar>
;; <atomic-te>    ::= <num-te> | <bool-te> | <void-te>
;; <num-te>       ::= number   // num-te()
;; <bool-te>      ::= boolean  // bool-te()
;; <str-te>       ::= string   // str-te()
;; <void-te>      ::= void     // void-te()
;; <compound-te>  ::= <proc-te> | <tuple-te> | <union-te> TODO L51
;; <non-tuple-te> ::= <atomic-te> | <proc-te> | <tvar>
;; <proc-te>      ::= [ <tuple-te> -> <non-tuple-te> ] // proc-te(param-tes: list(te), return-te: te)
;; <tuple-te>     ::= <non-empty-tuple-te> | <empty-te>
;; <non-empty-tuple-te> ::= ( <non-tuple-te> *)* <non-tuple-te> // tuple-te(tes: list(te))
;; <empty-te>     ::= Empty
;; TODO L51
;; <union-te>     ::= (union <texp> <texp>) // union-te(components: list(te))
;; <tvar>         ::= a symbol starting with T // tvar(id: Symbol, contents; Box(string|boolean))

;; Examples of type expressions
;; number
;; boolean
;; void
;; [number -> boolean]
;; [number * number -> boolean]
;; [number -> [number -> boolean]]
;; [Empty -> number]
;; [Empty -> void]

;; TODO L51
;; Support the following type expressions:
;; [union number boolean]
;; [union [union number boolean] string]  
;; [Empty -> [union boolean number]]
;; [union [T1 -> T1] [Empty -> T1]]
*/
import { chain, comparator, concat, equals, flatten, map, sort, sortBy, uniq } from "ramda";
import { Sexp } from "s-expression";
import { List, isEmpty, isNonEmptyList } from "../shared/list";
import { isArray, isBoolean, isString } from '../shared/type-predicates';
import { makeBox, setBox, unbox, Box } from '../shared/box';
import { cons, first, rest } from '../shared/list';
import { Result, bind, makeOk, makeFailure, mapResult, mapv, isFailure, isOk } from "../shared/result";
import { parse as p } from "../shared/parser";
import { format } from "../shared/format";
import { Exp, unparse } from "./L5-ast";
import { zipWithResult } from "../shared/result";
//import { makeUnion } from "./L5-typecheck";

// TODO L51: Support union types where needed
export type TExp =  AtomicTExp | CompoundTExp | TVar;
export const isTExp = (x: any): x is TExp => isAtomicTExp(x) || isCompoundTExp(x) || isTVar(x);

export type UnionTExp = {tag: "UnionTExp"; components: TExp[];};
export const isUnionTExp = (x: any): x is UnionTExp =>
    x.tag === "UnionTExp";
export const makeUnionTExp = (comps: TExp[]): UnionTExp => ({tag: "UnionTExp", components: comps.sort(compareTag)});

export type AtomicTExp = NumTExp | BoolTExp | StrTExp | VoidTExp;
export const isAtomicTExp = (x: any): x is AtomicTExp =>
    isNumTExp(x) || isBoolTExp(x) || isStrTExp(x) || isVoidTExp(x);

export type CompoundTExp = ProcTExp | TupleTExp | UnionTExp;
export const isCompoundTExp = (x: any): x is CompoundTExp => isProcTExp(x) || isTupleTExp(x) || isUnionTExp(x);

export type NonTupleTExp = AtomicTExp | ProcTExp | TVar;
export const isNonTupleTExp = (x: any): x is NonTupleTExp =>
    isAtomicTExp(x) || isProcTExp(x) || isTVar(x);

export type NumTExp = { tag: "NumTExp" };
export const makeNumTExp = (): NumTExp => ({tag: "NumTExp"});
export const isNumTExp = (x: any): x is NumTExp => x.tag === "NumTExp";

export type BoolTExp = { tag: "BoolTExp" };
export const makeBoolTExp = (): BoolTExp => ({tag: "BoolTExp"});
export const isBoolTExp = (x: any): x is BoolTExp => x.tag === "BoolTExp";

export type StrTExp = { tag: "StrTExp" };
export const makeStrTExp = (): StrTExp => ({tag: "StrTExp"});
export const isStrTExp = (x: any): x is StrTExp => x.tag === "StrTExp";

export type VoidTExp = { tag: "VoidTExp" };
export const makeVoidTExp = (): VoidTExp => ({tag: "VoidTExp"});
export const isVoidTExp = (x: any): x is VoidTExp => x.tag === "VoidTExp";

// proc-te(param-tes: list(te), return-te: te)
export type ProcTExp = { tag: "ProcTExp"; paramTEs: TExp[]; returnTE: TExp; };
export const makeProcTExp = (paramTEs: TExp[], returnTE: TExp): ProcTExp =>
    ({tag: "ProcTExp", paramTEs: paramTEs, returnTE: returnTE});
export const isProcTExp = (x: any): x is ProcTExp => x.tag === "ProcTExp";
// Uniform access to all components of a ProcTExp
export const procTExpComponents = (pt: ProcTExp): TExp[] =>
    [...pt.paramTEs, pt.returnTE];

export type TupleTExp = NonEmptyTupleTExp | EmptyTupleTExp;
export const isTupleTExp = (x: any): x is TupleTExp =>
    isNonEmptyTupleTExp(x) || isEmptyTupleTExp(x);

export type EmptyTupleTExp = { tag: "EmptyTupleTExp" }
export const makeEmptyTupleTExp = (): EmptyTupleTExp => ({tag: "EmptyTupleTExp"});
export const isEmptyTupleTExp = (x: any): x is EmptyTupleTExp => x.tag === "EmptyTupleTExp";

// NonEmptyTupleTExp(TEs: NonTupleTExp[])
export type NonEmptyTupleTExp = { tag: "NonEmptyTupleTExp"; TEs: NonTupleTExp[]; }
export const makeNonEmptyTupleTExp = (tes: NonTupleTExp[]): NonEmptyTupleTExp =>
    ({tag: "NonEmptyTupleTExp", TEs: tes});
export const isNonEmptyTupleTExp = (x: any): x is NonEmptyTupleTExp => x.tag === "NonEmptyTupleTExp";

// TVar: Type Variable with support for dereferencing (TVar -> TVar)
export type TVar = { tag: "TVar"; var: string; contents: Box<undefined | TExp>; };
export const isEmptyTVar = (x: any): x is TVar =>
    (x.tag === "TVar") && unbox(x.contents) === undefined;
export const makeTVar = (v: string): TVar =>
    ({tag: "TVar", var: v, contents: makeBox(undefined)});
const makeTVarGen = (): () => TVar => {
    let count: number = 0;
    return () => {
        count++;
        return makeTVar(`T_${count}`);
    }
}
export const makeFreshTVar = makeTVarGen();
export const isTVar = (x: any): x is TVar => x.tag === "TVar";
export const eqTVar = (tv1: TVar, tv2: TVar): boolean => tv1.var === tv2.var;
export const tvarContents = (tv: TVar): undefined | TExp => unbox(tv.contents);
export const tvarSetContents = (tv: TVar, val: TExp): void =>
    setBox(tv.contents, val);
export const tvarIsNonEmpty = (tv: TVar): boolean => tvarContents(tv) !== undefined;
export const tvarDeref = (te: TExp): TExp => {
    if (! isTVar(te)) return te;
    const contents = tvarContents(te);
    if (contents === undefined)
        return te;
    else if (isTVar(contents))
        return tvarDeref(contents);
    else
        return contents;
}

// ========================================================
// TExp Utilities

// Purpose: uniform access to atomic types
export const atomicTExpName = (te: AtomicTExp): string => te.tag;

export const eqAtomicTExp = (te1: AtomicTExp, te2: AtomicTExp): boolean =>
    atomicTExpName(te1) === atomicTExpName(te2);


// ========================================================
// TExp parser

export const parseTE = (t: string): Result<TExp> =>
    bind(p(t), parseTExp);

/*
;; Purpose: Parse a type expression
;; Type: [SExp -> TExp[]]
;; Example:
;; parseTExp("number") => 'num-te
;; parseTExp('boolean') => 'bool-te
;; parseTExp('T1') => '(tvar T1)
;; parseTExp('(T * T -> boolean)') => '(proc-te ((tvar T) (tvar T)) bool-te)
;; parseTExp('(number -> (number -> number)') => '(proc-te (num-te) (proc-te (num-te) num-te))
*/
export const parseTExp = (texp: Sexp): Result<TExp> =>
    (texp === "number") ? makeOk(makeNumTExp()) :
    (texp === "boolean") ? makeOk(makeBoolTExp()) :
    (texp === "void") ? makeOk(makeVoidTExp()) :
    (texp === "string") ? makeOk(makeStrTExp()) :
    isString(texp) ? makeOk(makeTVar(texp)) :
    isArray(texp) ? parseCompoundTExp(texp) :
    makeFailure(`Unexpected TExp - ${format(texp)}`);

// TODO L51: Support parsing of union types
/*
;; expected structure: (<params> -> <returnte>)
;; expected exactly one -> in the list
;; We do not accept (a -> b -> c) - must parenthesize
*/
const parseCompoundTExp = (texps: Sexp[]): Result<CompoundTExp> => {
    const pos1 = texps.indexOf('->');
    const pos2 = texps.indexOf('union');

    if((pos1 === -1)){
        if((pos2 === -1))
            return makeFailure(`Not a procedure and not union type`);
        
        //its union
        if(pos2 > 0 || texps.length != 3)
            return makeFailure(`Illegal union type`);
        
        return bind(parseTExp(texps[pos2 + 1]), (t1: TExp) =>
                    bind(parseTExp(texps[pos2 + 2]), (t2: TExp) =>
                        makeOk(makeUnion(t1, t2))));
        // const comp1 = parseTExp(texps[pos2 + 1]);
        // if(isFailure(comp1))
        //     return comp1;

        // const comp2 = parseTExp(texps[pos2 + 2]);
        // if(isFailure(comp2))
        //     return comp2;
        
        // if(isUnionTExp(comp1.value)){
        //     if(isUnionTExp((comp2.value)))
        //         return makeOk(makeUnionTExp(flatten([comp1.value.components, comp2.value.components])));
        //     return makeOk(makeUnionTExp(flatten([comp1.value.components, comp2.value])));
        // }
        // if(isUnionTExp((comp2.value)))
        //         return makeOk(makeUnionTExp(flatten([comp1.value, comp2.value.components])));

        // return makeOk(makeUnionTExp(flatten([comp1.value, comp2.value])));
        
    }
    else{
        return (pos1 === -1)  ? makeFailure(`Procedure type expression without -> - ${format(texps)}`) :
           (pos1 === 0) ? makeFailure(`No param types in proc texp - ${format(texps)}`) :
           (pos1 === texps.length - 1) ? makeFailure(`No return type in proc texp - ${format(texps)}`) :
           (texps.slice(pos1 + 1).indexOf('->') > -1) ? makeFailure(`Only one -> allowed in a procexp - ${format(texps)}`) :
           bind(parseTupleTExp(texps.slice(0, pos1)), (args: TExp[]) =>
               mapv(parseTExp(texps[pos1 + 1]), (returnTE: TExp) =>
                    makeProcTExp(args, returnTE)));
    }
};


// const parseCompoundTExp = (texps: Sexp[]): Result<ProcTExp> => {
//     const pos = texps.indexOf('->');
//     return (pos === -1)  ? makeFailure(`Procedure type expression without -> - ${format(texps)}`) :
//            (pos === 0) ? makeFailure(`No param types in proc texp - ${format(texps)}`) :
//            (pos === texps.length - 1) ? makeFailure(`No return type in proc texp - ${format(texps)}`) :
//            (texps.slice(pos + 1).indexOf('->') > -1) ? makeFailure(`Only one -> allowed in a procexp - ${format(texps)}`) :
//            bind(parseTupleTExp(texps.slice(0, pos)), (args: TExp[]) =>
//                mapv(parseTExp(texps[pos + 1]), (returnTE: TExp) =>
//                     makeProcTExp(args, returnTE)));
// };

/*
;; Expected structure: <te1> [* <te2> ... * <ten>]?
;; Or: Empty
*/
const parseTupleTExp = (texps: Sexp[]): Result<TExp[]> => {
    const isEmptyTuple = (texps: Sexp[]): boolean =>
        (texps.length === 1) && (texps[0] === 'Empty');
    // [x1 * x2 * ... * xn] => [x1,...,xn]
    const splitEvenOdds = (texps: Sexp[]): Result<Sexp[]> =>
        isEmpty(texps) ? makeOk([]) :
        (texps.length === 1) ? makeOk(texps) :
        texps[1] !== '*' ? makeFailure(`Parameters of procedure type must be separated by '*': ${format(texps)}`) :
        mapv(splitEvenOdds(texps.slice(2)), (sexps: Sexp[]) => [texps[0], ...sexps]);

    return isEmptyTuple(texps) ? makeOk([]) : bind(splitEvenOdds(texps), (argTEs: Sexp[]) => 
                                                    mapResult(parseTExp, argTEs));
}

// TODO L51 support unparsing of union types
/*
;; Purpose: Unparse a type expression Texp into its concrete form
*/
export const unparseTExp = (te: TExp): Result<string> => {
    const unparseTuple = (paramTes: TExp[]): Result<string[]> =>
        isNonEmptyList<TExp>(paramTes) ? bind(unparseTExp(first(paramTes)), (paramTE: string) =>
            mapv(mapResult(unparseTExp, rest(paramTes)), (paramTEs: string[]) =>
                cons(paramTE, chain(te => ['*', te], paramTEs)))) :
        makeOk(["Empty"]);

    const unparseUnion = (compsTes: TExp[]): Result<string | string[]> =>{
        if(compsTes.length == 1)
                return unparseTExp(compsTes[0]);

        if(compsTes.length > 1)
            return bind(unparseTExp(compsTes[0]), (str1: string) => 
                        bind(unparseTExp(makeUnionTExp(compsTes.slice(1))), (str2: string | string[]) =>
                            makeOk(flatten(['union', str1 , str2]))));
        
        return makeFailure("components are empty");
        // const sortedAndUnparsed = sortArray(compsTes);

        // if(isOk(sortedAndUnparsed))
        //     unparseUnionStr(sortedAndUnparsed.value);

        // return sortedAndUnparsed;
    }

    // const unparseUnionStr = (comps: string | string[]): Result<string | string[]> =>{
    //     if(comps.length == 1)
    //             return makeOk(comps[0]);

    //     // if(comps.length == 2)
    //     //     return makeOk(flatten(['union', comps[0] , comps[1]]));

    //     if(comps.length > 1)
    //         return bind(makeOk(comps[0]), (str1: string) => 
    //                     bind(unparseTExp(makeUnionTExp(comps.slice(1))), (str2: string | string[]) =>
    //                         makeOk(flatten(['union', str1 , str2]))));
        
    //     return makeFailure("components are empty");
    // }

    // const sortArray = (compsTes: TExp[]): Result<string | string[]> =>{
    //     const unp = bind(up(compsTes[0]), (str1: string | string[]) => 
    //                     bind(sortArray(compsTes.slice(1)), (str2: string | string[]) =>
    //                         makeOk(flatten([str1 , str2]))));
        
    //     if(isOk(unp)){
    //         return makeOk(sort(comparestr, unp.value));
    //     }
    //     return unp;
    // }

    // const comparestr = (a: string, b: string): number =>
    //     a < b ? -1 :
    //     1;

    // const sortArrayTag = (compsTes: TExp[]): Result<string | string[]> =>{
    //     const unp = bind(((compsTes[0]).tag.toString()), (str1: string | string[]) => 
    //                     bind(sortArray(compsTes.slice(1)), (str2: string | string[]) =>
    //                         makeOk(flatten([str1 , str2]))));
        
    //     if(isOk(unp)){
    //         return makeOk(sort(comparestr, unp.value));
    //     }
    //     return unp;
    // }

    const up = (x?: TExp): Result<string | string[]> =>
        isNumTExp(x) ? makeOk('number') :
        isBoolTExp(x) ? makeOk('boolean') :
        isStrTExp(x) ? makeOk('string') :
        isVoidTExp(x) ? makeOk('void') :
        isEmptyTVar(x) ? makeOk(x.var) :
        isTVar(x) ? up(tvarContents(x)) :
        isUnionTExp(x) ? unparseUnion(x.components):
        isProcTExp(x) ? bind(unparseTuple(x.paramTEs), (paramTEs: string[]) =>
                            mapv(unparseTExp(x.returnTE), (returnTE: string) =>
                                [...paramTEs, '->', returnTE])) :
        isEmptyTupleTExp(x) ? makeOk("Empty") :
        isNonEmptyTupleTExp(x) ? unparseTuple(x.TEs) :
        x === undefined ? makeFailure("Undefined TVar") :
        x;

    const unparsed = up(te);
    return mapv(unparsed,
                (x: string | string[]) => isString(x) ? x :
                                          isArray(x) ? `(${x.join(' ')})` :
                                          x);
}

// No need to change this for Union
// ============================================================
// equivalentTEs: 2 TEs are equivalent up to variable renaming.
// For example:
// equivalentTEs(parseTExp('(T1 -> T2)'), parseTExp('(T3 -> T4)'))


// Signature: matchTVarsInTE(te1, te2, succ, fail)
// Type: [Texp * Texp * [List(Pair(Tvar, Tvar)) -> T1] * [Empty -> T2]] |
//       [List(Texp) * List(Texp) * ...]
// Purpose:   Receives two type expressions or list(texps) plus continuation procedures
//            and, in case they are equivalent, pass a mapping between
//            type variable they include to succ. Otherwise, invoke fail.
// Examples:
// matchTVarsInTE(parseTExp('(Number * T1 -> T1)',
//                parseTExp('(Number * T7 -> T5)'),
//                (x) => x,
//                () => false) ==> [[T1, T7], [T1, T5]]
// matchTVarsInTE(parseTExp('(Boolean * T1 -> T1)'),
//                parseTExp('(Number * T7 -> T5)'),
//                (x) => x,
//                () => false)) ==> false

type Pair<T1, T2> = {left: T1; right: T2};

const matchTVarsInTE = <T1, T2>(te1: TExp, te2: TExp,
                                succ: (mapping: Array<Pair<TVar, TVar>>) => T1,
                                fail: () => T2): T1 | T2 =>
    (isTVar(te1) || isTVar(te2)) ? matchTVarsinTVars(tvarDeref(te1), tvarDeref(te2), succ, fail) :
    (isAtomicTExp(te1) || isAtomicTExp(te2)) ?
        ((isAtomicTExp(te1) && isAtomicTExp(te2) && eqAtomicTExp(te1, te2)) ? succ([]) : fail()) :
    matchTVarsInTProcs(te1, te2, succ, fail);

// te1 and te2 are the result of tvarDeref
const matchTVarsinTVars = <T1, T2>(te1: TExp, te2: TExp,
                                    succ: (mapping: Array<Pair<TVar, TVar>>) => T1,
                                    fail: () => T2): T1 | T2 =>
    (isTVar(te1) && isTVar(te2)) ? (eqTVar(te1, te2) ? succ([]) : succ([{left: te1, right: te2}])) :
    (isTVar(te1) || isTVar(te2)) ? fail() :
    matchTVarsInTE(te1, te2, succ, fail);

const matchTVarsInTProcs = <T1, T2>(te1: TExp, te2: TExp,
        succ: (mapping: Array<Pair<TVar, TVar>>) => T1,
        fail: () => T2): T1 | T2 =>
    (isProcTExp(te1) && isProcTExp(te2)) ? matchTVarsInTEs(procTExpComponents(te1), procTExpComponents(te2), succ, fail) :
    fail();

const matchTVarsInTEs = <T1, T2>(te1: TExp[], te2: TExp[],
                                    succ: (mapping: Array<Pair<TVar, TVar>>) => T1,
                                    fail: () => T2): T1 | T2 =>
    // Match first then continue on rest
    isNonEmptyList<TExp>(te1) && isNonEmptyList<TExp>(te2) ?
        matchTVarsInTE(first(te1), first(te2),
                        (subFirst) => matchTVarsInTEs(rest(te1), rest(te2), 
                                        (subRest) => succ(concat(subFirst, subRest)), 
                                        fail),
                        fail) :
    (isEmpty(te1) && isEmpty(te2)) ? succ([]) :
    fail();

// Signature: equivalent-tes?(te1, te2)
// Purpose:   Check whether 2 type expressions are equivalent up to
//            type variable renaming.
// Example:  equivalentTEs(parseTExp('(T1 * (Number -> T2) -> T3))',
//                         parseTExp('(T4 * (Number -> T5) -> T6))') => #t
export const equivalentTEs = (te1: TExp, te2: TExp): boolean => {
    // console.log(`EqTEs ${format(te1)} - ${format(te2)}`);
    const tvarsPairs = matchTVarsInTE(te1, te2, (x) => x, () => false);
    // console.log(`EqTEs pairs = ${map(JSON.stringify, tvarsPairs)}`)
    if (isBoolean(tvarsPairs))
        return false;
    else {
        return (uniq(map((p) => p.left.var, tvarsPairs)).length === uniq(map((p) => p.right.var, tvarsPairs)).length);
    }
};

const compareTag = (a: TExp, b: TExp): number =>
        (a.tag.toString() < b.tag.toString()) ? -1 :
        1;

export const makeUnion = (te1: TExp, te2: TExp): UnionTExp =>{
    if(isUnionTExp(te1)){
        if(isUnionTExp(te2)){
            const comps = (uniq(flatten([te1.components, te2.components]))).sort(compareTag);
            return ({tag: "UnionTExp", components: comps});
        }
        const comps = (uniq(flatten([te1.components, te2]))).sort(compareTag);
            return ({tag: "UnionTExp", components: comps});           
    }
    if(isUnionTExp(te2)){
        const comps = (uniq(flatten([te1, te2.components]))).sort(compareTag);
        return ({tag: "UnionTExp", components: comps});
    }
    const comps = (uniq(flatten([te1, te2]))).sort(compareTag);
    return ({tag: "UnionTExp", components: comps});
};

export const checkArgs = (te1: TExp[], te2: TExp[], exp: Exp): Result<true> =>{
    //return bind(zipWithResult(checkCompatibleType, te2, te1), _ => makeOk(true));
    if(isNonEmptyList<TExp>(te1)){
        if(isNonEmptyList<TExp>(te2)){
            return bind(checkCompatibleType(first(te2), first(te1), exp), (x: true) =>
                        bind(checkArgs(rest(te1), rest(te2), exp), (y: true) =>
                            makeOk(true)));
        }
    }
    return makeOk(true);    
}

export const checkCompatibleType = (te1: TExp, te2: TExp, exp: Exp): Result<true> =>{
    if(isProcTExp(te1) && isProcTExp(te2)){
        if(te1.paramTEs.length != te2.paramTEs.length)
            return makeFailure<true>("The procedures don't have the same amount of arguments");
        
        const ret = checkCompatibleType(te1.returnTE, te2.returnTE, exp);
        if(isOk(ret)){
            if(isOk(checkArgs(te1.paramTEs, te2.paramTEs, exp))){
                return(makeOk(true));
            }
            return makeFailure<true>("The procedures' arguments are not compatible");
        }
        return makeFailure<true>("The procedures don't have the same amount of arguments");
    }
    if(isUnionTExp(te2)){
        if(isUnionTExp(te1)){
            const isSub = isSubType(te1.components, te2.components);
            if(isSub)
                return makeOk(true);
            return makeFailure<true>(`Incompatible types: ${te1} and ${te2} in ${exp}`);
        }

        const pos = (te2.components).reduce((acc, cur) => acc || equals(te1, cur), false);
        if(pos)
            return makeOk(true);
        return makeFailure<true>(`Incompatible types: ${te1} and ${te2} in ${exp}`);
    }
    if(equals(te1, te2))
        return makeOk(true);

    return bind(unparseTExp(te1), (te1: string) =>
        bind(unparseTExp(te2), (te2: string) =>
            bind(unparse(exp), (exp: string) => 
                makeFailure<true>(`Incompatible types: ${te1} and ${te2} in ${exp}`))));
}

export const isSubType = (te1: TExp[], te2: TExp[]): boolean =>{
    if(te1.length > te2.length)
        return false;
    return te1.reduce((acc1, cur1) => acc1 && (te2.reduce((acc2, cur2) => acc2 || equals(cur1, cur2), false)), true);
}

