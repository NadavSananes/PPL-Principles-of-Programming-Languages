import { compose, map } from 'ramda';
import { makeAppExp, LetExp, ProcExp, IfExp, AppExp, CompoundExp, PrimOp,
     AtomicExp, isLetExp, isProcExp, isIfExp, isAppExp, isVarRef, isPrimOp,
      isStrExp, isBoolExp, isNumExp, isCompoundExp, isAtomicExp, CExp, Exp,
      Program, isExp, isProgram, DefineExp, isDefineExp, isCExp, VarDecl,
      makeProgram } from '../imp/L3-ast';
import { Result, makeFailure, makeOk } from '../shared/result';
import { valueToString, Value } from '../imp/L3-value';
import { isNumber, isString } from '../shared/type-predicates';
import { isEmpty, first, rest } from '../shared/list';

/*
Purpose: Transform L2 AST to Python program string
Signature: l2ToPython(l2AST)
Type: [Parsed | Error] => Result<string>
*/
export const l2ToPython = (exp: Exp | Program): Result<string>  => 
    isExp(exp) ? makeOk(reWriteExp(exp)) :
    isProgram(exp) ? makeOk(reWriteProgram(exp)):
    makeFailure('error');

//Exp
export const reWriteExp = (exp: Exp): string  => 
    isDefineExp(exp) ? `${reWriteDefineExp(exp)}`:
    isCExp(exp) ? `${reWriteCExp(exp)}`:
    '';

//program
export const reWriteProgram = (exp: Program): string =>
    `${map((ex: Exp) => reWriteExp(ex), exp.exps).join('\n')}`;

//DefineExp
export const reWriteDefineExp = (exp: DefineExp): string =>
    `${exp.var.var} = ${reWriteCExp(exp.val)}`;

//CExp
export const reWriteCExp = (exp: CExp): string => 
    isAtomicExp(exp) ? reWriteAtomicExp(exp):
    isCompoundExp(exp) ? reWriteCompoundExp(exp):
    '';

//AtomicExp
export const reWriteAtomicExp = (exp: AtomicExp): string => 
    isNumExp(exp) ? valueToStringPython(exp.val):
    isBoolExp(exp) ? valueToStringPython(exp.val):
    isStrExp(exp) ? valueToStringPython(exp.val):
    isPrimOp(exp) ? reWritePrimOp(exp):
    isVarRef(exp) ? valueToStringPython(exp.var):
    '';

//CompoundExp
export const reWriteCompoundExp = (exp: CompoundExp): string => 
    isAppExp(exp) ? reWriteAppExp(exp):
    isIfExp(exp) ? reWriteIfExp(exp):
    isProcExp(exp) ? reWriteProcExp(exp):
    '';

//AppExp
export const reWriteAppExp = (exp: AppExp): string => 
    (isPrimOp(exp.rator) && exp.rands.length == 1) ? `(${reWriteCExp(exp.rator)} ${map((rand: CExp) => reWriteCExp(rand), exp.rands).join('')})` :
    isPrimOp(exp.rator) ?  `(${map((rand: CExp) => reWriteCExp(rand), exp.rands).join(` ${reWriteCExp(exp.rator)} `)})`:    
    `${reWriteCExp(exp.rator)}(${map((rand: CExp) => reWriteCExp(rand), exp.rands).join(',')})`
    ;

//IfExp
export const reWriteIfExp = (exp: IfExp): string => 
    `(${reWriteCExp(exp.then)} if ${reWriteCExp(exp.test)} else ${reWriteCExp(exp.alt)})`;

//ProcExp
export const reWriteProcExp = (exp: ProcExp): string => 
    `(lambda ${map((rand: VarDecl) => rand.var, exp.args).join(',')} : ${map((bodyExp: CExp) => reWriteCExp(bodyExp), exp.body).join(' ')})`
    '';
//
export const reWritePrimOp = (exp: PrimOp): string => 
    // exp.op === '+' || exp.op ==='-' || '*' || '/' || '>' || '<' || 'and' || 'or' || 'not' 
    //  ? exp.op:
    exp.op === 'boolean?' ? `(lambda x : (type(x) == bool))`:
    exp.op === 'number?' ? `(lambda x : (type(x) == int or type(x) == float))`:
    exp.op === 'eq?' ? '==':
    exp.op === '=' ? '==':
    exp.op;

export const valueToStringPython = (val: Value): string =>
    isNumber(val) ?  valueToString(val):
    val === true ? 'True' :
    val === false ? 'False' :
    isString(val) ? val :
    isVarRef(val) ? val:    
    '';

