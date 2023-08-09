// L5-typecheck
// ========================================================
import { equals, flatten, map, reduce, uniq, zipWith } from 'ramda';
import { isAppExp, isBoolExp, isDefineExp, isIfExp, isLetrecExp, isLetExp, isNumExp,
         isPrimOp, isProcExp, isProgram, isStrExp, isVarRef, parseL5Exp, unparse,
         AppExp, BoolExp, DefineExp, Exp, IfExp, LetrecExp, LetExp, NumExp,
         Parsed, PrimOp, ProcExp, Program, StrExp, parseL5Program } from "./L5-ast";
import { applyTEnv, makeEmptyTEnv, makeExtendTEnv, TEnv } from "./TEnv";
import { isProcTExp, makeBoolTExp, makeNumTExp, makeProcTExp, makeStrTExp, makeVoidTExp,
         parseTE, unparseTExp,
         BoolTExp, NumTExp, StrTExp, TExp, VoidTExp, makeEmptyTupleTExp, isUnionTExp, UnionTExp, checkCompatibleType, makeUnion } from "./TExp";
import { isEmpty, allT, first, rest, NonEmptyList, List, isNonEmptyList } from '../shared/list';
import { Result, makeFailure, bind, makeOk, zipWithResult, isOk, isFailure } from '../shared/result';
import { parse as p } from "../shared/parser";
import { format } from '../shared/format';
import { globalEnvAddBinding, theGlobalEnv } from './L5-env';
import { isSExp } from './L5-value';

// TODO L51
// Purpose: Check that type expressions are compatible
// as part of a fully-annotated type check process of exp.
// Return an error if te1 is not compatible with te2 - true otherwise.
// Exp is only passed for documentation purposes.
// export const checkArgs = (te1: TExp[], te2: TExp[], exp: Exp): Result<true> =>{
//     if(isNonEmptyList<TExp>(te1)){
//         if(isNonEmptyList<TExp>(te2)){
//             return bind(checkCompatibleType(first(te1), first(te2), exp), (x: true) =>
//                         bind(checkArgs(rest(te1), rest(te2), exp), (y: true) =>
//                             makeOk(true)));
//         }
//     }
//     return makeFailure<true>("The procedures don't have the same amount of arguments");    
// }

// export const checkCompatibleType = (te1: TExp, te2: TExp, exp: Exp): Result<true> =>{
//     if(isProcTExp(te1) && isProcTExp(te2)){
//         if(te1.paramTEs.length != te2.paramTEs.length)
//             return makeFailure<true>("The procedures don't have the same amount of arguments");
        
//         const ret = checkCompatibleType(te1.returnTE, te2.returnTE, exp);
//         if(isOk(ret)){
//             if(isOk(checkArgs(te1.paramTEs, te2.paramTEs, exp))){
//                 return(makeOk(true));
//             }
//             return makeFailure<true>("The procedures' arguments are not compatible");
//         }
//         return makeFailure<true>("The procedures don't have the same amount of arguments");
//     }
//     if(isUnionTExp(te2)){
//         if(isUnionTExp(te1)){
//             const isSub = isSubType(te1.components, te2.components);
//             if(isSub)
//                 return makeOk(true);
//             return makeFailure<true>(`Incompatible types: ${te1} and ${te2} in ${exp}`);
//         }

//         const pos = (te2.components).reduce((acc, cur) => acc || equals(te1, cur), false);
//         if(pos)
//             return makeOk(true);
//         return makeFailure<true>(`Incompatible types: ${te1} and ${te2} in ${exp}`);
//     }
//     if(equals(te1, te2))
//         return makeOk(true);

//     return bind(unparseTExp(te1), (te1: string) =>
//         bind(unparseTExp(te2), (te2: string) =>
//             bind(unparse(exp), (exp: string) => 
//                 makeFailure<true>(`Incompatible types: ${te1} and ${te2} in ${exp}`))));
// }

// export const isSubType = (te1: TExp[], te2: TExp[]): boolean =>{
//     if(te1.length > te2.length)
//         return false;
//     return te1.reduce((acc1, cur1) => acc1 && (te2.reduce((acc2, cur2) => acc2 || equals(cur1, cur2), false)), true);
// }

// Compute the type of L5 AST exps to TE
// ===============================================
// Compute a Typed-L5 AST exp to a Texp on the basis
// of its structure and the annotations it contains.

// Purpose: Compute the type of a concrete fully-typed expression
export const L5Programtypeof = (concreteExp: string): Result<string> =>
    bind(p(concreteExp), (x) =>
        bind(parseL5Program(x), (e: Program) => 
            bind(typeofExp(e, makeEmptyTEnv()), unparseTExp)));

export const L5typeof = (concreteExp: string): Result<string> =>
    bind(p(concreteExp), (x) =>
        bind(parseL5Exp(x), (e: Exp) => 
            bind(typeofExp(e, makeEmptyTEnv()), unparseTExp)));

// Purpose: Compute the type of an expression
// Traverse the AST and check the type according to the exp type.
// We assume that all variables and procedures have been explicitly typed in the program.
export const typeofExp = (exp: Parsed, tenv: TEnv): Result<TExp> =>
    isNumExp(exp) ? makeOk(typeofNum(exp)) :
    isBoolExp(exp) ? makeOk(typeofBool(exp)) :
    isStrExp(exp) ? makeOk(typeofStr(exp)) :
    isPrimOp(exp) ? typeofPrim(exp) :
    isVarRef(exp) ? applyTEnv(tenv, exp.var) :
    isIfExp(exp) ? typeofIf(exp, tenv) :
    isProcExp(exp) ? typeofProc(exp, tenv) :
    isAppExp(exp) ? typeofApp(exp, tenv) :
    isLetExp(exp) ? typeofLet(exp, tenv) :
    isLetrecExp(exp) ? typeofLetrec(exp, tenv) :
    isDefineExp(exp) ? typeofDefine(exp, tenv) :
    isProgram(exp) ? typeofProgram(exp, tenv) :
    makeFailure(`Unknown type: ${format(exp)}`);

// Purpose: Compute the type of a sequence of expressions
// Check all the exps in a sequence - return type of last.
// Pre-conditions: exps is not empty.
export const typeofExps = (exps: List<Exp>, tenv: TEnv): Result<TExp> =>
    isNonEmptyList<Exp>(exps) ? 
        isEmpty(rest(exps)) ? typeofExp(first(exps), tenv) :
        bind(typeofExp(first(exps), tenv), _ => typeofExps(rest(exps), tenv)) :
    makeFailure(`Unexpected empty list of expressions`);


// a number literal has type num-te
export const typeofNum = (n: NumExp): NumTExp => makeNumTExp();

// a boolean literal has type bool-te
export const typeofBool = (b: BoolExp): BoolTExp => makeBoolTExp();

// a string literal has type str-te
const typeofStr = (s: StrExp): StrTExp => makeStrTExp();

// primitive ops have known proc-te types
const numOpTExp = parseTE('(number * number -> number)');
const numCompTExp = parseTE('(number * number -> boolean)');
const boolOpTExp = parseTE('(boolean * boolean -> boolean)');

// Todo: cons, car, cdr, list
export const typeofPrim = (p: PrimOp): Result<TExp> =>
    (p.op === '+') ? numOpTExp :
    (p.op === '-') ? numOpTExp :
    (p.op === '*') ? numOpTExp :
    (p.op === '/') ? numOpTExp :
    (p.op === 'and') ? boolOpTExp :
    (p.op === 'or') ? boolOpTExp :
    (p.op === '>') ? numCompTExp :
    (p.op === '<') ? numCompTExp :
    (p.op === '=') ? numCompTExp :
    // Important to use a different signature for each op with a TVar to avoid capture
    (p.op === 'number?') ? parseTE('(T -> boolean)') :
    (p.op === 'boolean?') ? parseTE('(T -> boolean)') :
    (p.op === 'string?') ? parseTE('(T -> boolean)') :
    (p.op === 'list?') ? parseTE('(T -> boolean)') :
    (p.op === 'pair?') ? parseTE('(T -> boolean)') :
    (p.op === 'symbol?') ? parseTE('(T -> boolean)') :
    (p.op === 'not') ? parseTE('(boolean -> boolean)') :
    (p.op === 'eq?') ? parseTE('(T1 * T2 -> boolean)') :
    (p.op === 'string=?') ? parseTE('(T1 * T2 -> boolean)') :
    (p.op === 'display') ? parseTE('(T -> void)') :
    (p.op === 'newline') ? parseTE('(Empty -> void)') :
    makeFailure(`Primitive not yet implemented: ${p.op}`);

// TODO L51
// export const makeUnion = (te1: TExp, te2: TExp): UnionTExp =>{
//     if(isUnionTExp(te1)){
//         if(isUnionTExp(te2)){
//             const comps = (uniq(flatten([te1.components, te2.components])));
//             return ({tag: "UnionTExp", components: comps});
//         }
//         const comps = (uniq(flatten([te1.components, te2])));
//             return ({tag: "UnionTExp", components: comps});           
//     }
//     if(isUnionTExp(te2)){
//         const comps = (uniq(flatten([te1, te2.components])));
//         return ({tag: "UnionTExp", components: comps});
//     }
//     const comps = (uniq(flatten([te1, te2])));
//     return ({tag: "UnionTExp", components: comps});
// };
   

// TODO L51
// Purpose: compute the type of an if-exp
// Typing rule:
//   if type<test>(tenv) = boolean
//      type<then>(tenv) = t1
//      type<else>(tenv) = t2
// then type<(if test then else)>(tenv) = (union t1 t2)
export const typeofIf = (ifExp: IfExp, tenv: TEnv): Result<TExp> => {
    const testTE = typeofExp(ifExp.test, tenv);
    const thenTE = typeofExp(ifExp.then, tenv);
    const altTE = typeofExp(ifExp.alt, tenv);
    const constraint1 = bind(testTE, testTE => checkCompatibleType(testTE, makeBoolTExp(), ifExp));
    // const constraint2 = bind(thenTE, (thenTE: TExp) =>
    //                         bind(altTE, (altTE: TExp) =>
    //                             checkCompatibleType(thenTE, altTE, ifExp)));
    if(equals(thenTE, altTE))
        return bind(constraint1, (_c1: true) =>            
                    thenTE);
    return bind(constraint1, (_c1: true) =>
                bind(thenTE, (_c2: TExp) =>
                    bind(altTE, (_c3: TExp) =>
                        makeOk(makeUnion(_c2, _c3)))));
};

// Purpose: compute the type of a proc-exp
// Typing rule:
// If   type<body>(extend-tenv(x1=t1,...,xn=tn; tenv)) = t
// then type<lambda (x1:t1,...,xn:tn) : t exp)>(tenv) = (t1 * ... * tn -> t)
export const typeofProc = (proc: ProcExp, tenv: TEnv): Result<TExp> => {
    const argsTEs = map((vd) => vd.texp, proc.args);
    const extTEnv = makeExtendTEnv(map((vd) => vd.var, proc.args), argsTEs, tenv);
    const constraint1 = bind(typeofExps(proc.body, extTEnv), (body: TExp) => 
                            checkCompatibleType(body, proc.returnTE, proc));
    return bind(constraint1, _ => makeOk(makeProcTExp(argsTEs, proc.returnTE)));
};

// Purpose: compute the type of an app-exp
// Typing rule:
// If   type<rator>(tenv) = (t1*..*tn -> t)
//      type<rand1>(tenv) = t1
//      ...
//      type<randn>(tenv) = tn
// then type<(rator rand1...randn)>(tenv) = t
// We also check the correct number of arguments is passed.
export const typeofApp = (app: AppExp, tenv: TEnv): Result<TExp> =>
    bind(typeofExp(app.rator, tenv), (ratorTE: TExp) => {
        if (! isProcTExp(ratorTE)) {
            return bind(unparseTExp(ratorTE), (rator: string) =>
                        bind(unparse(app), (exp: string) =>
                            makeFailure<TExp>(`Application of non-procedure: ${rator} in ${exp}`)));
        }
        if (app.rands.length !== ratorTE.paramTEs.length) {
            return bind(unparse(app), (exp: string) => makeFailure<TExp>(`Wrong parameter numbers passed to proc: ${exp}`));
        }
        const constraints = zipWithResult((rand, trand) => bind(typeofExp(rand, tenv), (typeOfRand: TExp) => 
                                                                checkCompatibleType(typeOfRand, trand, app)),
                                          app.rands, ratorTE.paramTEs);
        return bind(constraints, _ => makeOk(ratorTE.returnTE));
    });

// Purpose: compute the type of a let-exp
// Typing rule:
// If   type<val1>(tenv) = t1
//      ...
//      type<valn>(tenv) = tn
//      type<body>(extend-tenv(var1=t1,..,varn=tn; tenv)) = t
// then type<let ((var1 val1) .. (varn valn)) body>(tenv) = t
export const typeofLet = (exp: LetExp, tenv: TEnv): Result<TExp> => {
    const vars = map((b) => b.var.var, exp.bindings);
    const vals = map((b) => b.val, exp.bindings);
    const varTEs = map((b) => b.var.texp, exp.bindings);
    const constraints = zipWithResult((varTE, val) => bind(typeofExp(val, tenv), (typeOfVal: TExp) => 
                                                            checkCompatibleType(typeOfVal, varTE, exp)),
                                      varTEs, vals);
    return bind(constraints, _ => typeofExps(exp.body, makeExtendTEnv(vars, varTEs, tenv)));
};

// Purpose: compute the type of a letrec-exp
// We make the same assumption as in L4 that letrec only binds proc values.
// Typing rule:
//   (letrec((p1 (lambda (x11 ... x1n1) body1)) ...) body)
//   tenv-body = extend-tenv(p1=(t11*..*t1n1->t1)....; tenv)
//   tenvi = extend-tenv(xi1=ti1,..,xini=tini; tenv-body)
// If   type<body1>(tenv1) = t1
//      ...
//      type<bodyn>(tenvn) = tn
//      type<body>(tenv-body) = t
// then type<(letrec((p1 (lambda (x11 ... x1n1) body1)) ...) body)>(tenv-body) = t
export const typeofLetrec = (exp: LetrecExp, tenv: TEnv): Result<TExp> => {
    const ps = map((b) => b.var.var, exp.bindings);
    const procs = map((b) => b.val, exp.bindings);
    if (! allT(isProcExp, procs))
        return makeFailure(`letrec - only support binding of procedures - ${format(exp)}`);
    const paramss = map((p) => p.args, procs);
    const bodies = map((p) => p.body, procs);
    const tijs = map((params) => map((p) => p.texp, params), paramss);
    const tis = map((proc) => proc.returnTE, procs);
    const tenvBody = makeExtendTEnv(ps, zipWith((tij, ti) => makeProcTExp(tij, ti), tijs, tis), tenv);
    const tenvIs = zipWith((params, tij) => makeExtendTEnv(map((p) => p.var, params), tij, tenvBody),
                           paramss, tijs);
    const types = zipWithResult((bodyI, tenvI) => typeofExps(bodyI, tenvI), bodies, tenvIs)
    const constraints = bind(types, (types: TExp[]) => 
                            zipWithResult((typeI, ti) => checkCompatibleType(typeI, ti, exp), types, tis));
    return bind(constraints, _ => typeofExps(exp.body, tenvBody));
};

// Typecheck a full program
// TODO L51
// TODO: Thread the TEnv (as in L1)

// Purpose: compute the type of a define
// Typing rule:
//   (define (var : texp) val)
// TODO L51 - write the true definition
// if type<val> (tenv o (var : t1)) = t1
// then type <(define (var : texp) val)> (tenv) = void
export const typeofDefine = (exp: DefineExp, tenv: TEnv): Result<VoidTExp> =>{
    const newEnv = makeExtendTEnv([exp.var.var], [exp.var.texp], tenv);
    return bind(typeofExp(exp.val, newEnv), (valT: TExp) =>
                (bind(checkCompatibleType(valT, exp.var.texp, exp), _ =>
                    makeOk(makeVoidTExp()))));
}
    


// Purpose: compute the type of a program
// Typing rule:
// TODO - write the true definition
export const typeofProgram = (exp: Program, tenv: TEnv): Result<TExp> => {
    if(exp.exps.length === 0)
        return makeFailure("the program is empty");
    return typeofNonEmptyProgram(exp.exps, tenv);
};

export const typeofNonEmptyProgram = (exps: List<Exp>, tenv: TEnv): Result<TExp> => {
    if(isNonEmptyList<Exp>(exps)){
        const frst = first(exps);
        
        if(isDefineExp(frst) && isEmpty(rest(exps))){ //case num 1
            const newEnv = makeExtendTEnv([frst.var.var], [frst.var.texp], tenv);
            return typeofDefine(frst, newEnv);
        } 

        if(isDefineExp(frst)){  //case num 2
            const newEnv = makeExtendTEnv([frst.var.var], [frst.var.texp], tenv);           
            return bind(typeofDefine(frst, newEnv), _ => typeofNonEmptyProgram(rest(exps), newEnv));
        } 

        if(isEmpty(rest(exps))){ //case num 3
            return typeofExp(first(exps), tenv);
        }

        return bind(typeofExp(first(exps), tenv), _ => typeofNonEmptyProgram(rest(exps), tenv)); //case num 4
    }        
    return makeFailure(`Unexpected empty list of expressions`);
}
    

    
