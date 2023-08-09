import {  CExp, CondClause, CondExp, Exp, IfExp, Program, isAppExp, isAtomicExp, isCondExp, isDefineExp, isExp, isIfExp, isLetExp, isLitExp, isProcExp, isProgram, makeAppExp, makeBoolExp, makeDefineExp, makeIfExp, makeLetExp, makeProcExp, makeProgram, parseL31, parseL31CExp, parseL31Exp } from "./L31-ast";
import { Result, makeFailure, makeOk } from "../shared/result";
import { cons } from "../shared/list";
import { is, map } from "ramda";


/*
Purpose: Transform L31 AST to L3 AST
Signature: l31ToL3(l31AST)
Type: [Exp | Program] => Result<Exp | Program>
*/
export const L31ToL3 = (exp: Exp | Program): Result<Exp | Program> =>
    isExp(exp) ? makeOk(reWriteAllCondExp(exp)) :
    isProgram(exp) ? makeOk(reWrtieAllCondProgram(exp)):
    makeOk(exp);

const reWriteAllCondExp = (exp: Exp): Exp => 
    isDefineExp(exp) ? makeDefineExp(exp.var, reWriteAllCond(exp.val)):
    reWriteAllCond(exp);

const reWrtieAllCondProgram = (exp: Program): Program => 
    makeProgram(map(reWriteAllCondExp, exp.exps));

const reWriteAllCond = (e: CExp): CExp =>
    isAtomicExp(e) ? e:
    isAppExp(e) ? makeAppExp(reWriteAllCond(e.rator), map(reWriteAllCond, e.rands)):
    isIfExp(e) ? makeIfExp(reWriteAllCond(e.test), reWriteAllCond(e.then), reWriteAllCond(e.alt)):
    isProcExp(e) ? makeProcExp(e.args, map(reWriteAllCond, e.body)):
    isLetExp(e) ? makeLetExp(e.bindings, map(reWriteAllCond, e.body)):
    isLitExp(e) ? e:
    isCondExp(e) ? reWriteCond(e):
    e;


export const reWriteCond = (ce: CondExp) : IfExp =>
    reWriteCond2(ce.condclauses, 0);

const reWriteCond2 = (cc: CondClause[], i:number): IfExp => 
    i === cc.length -2 ? makeIfExp(cc[i].test, cc[i].then[0], cc[i+1].then[0]):
    makeIfExp(cc[i].test, cc[i].then[0], reWriteCond2(cc, i+1));

