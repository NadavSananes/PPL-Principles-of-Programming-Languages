/*
 * **********************************************
 * Printing result depth
 *
 * You can enlarge it, if needed.
 * **********************************************
 */
maximum_printing_depth(100).

:- current_prolog_flag(toplevel_print_options, A),
   (select(max_depth(_), A, B), ! ; A = B),
   maximum_printing_depth(MPD),
   set_prolog_flag(toplevel_print_options, [max_depth(MPD)|B]).


list(empty).
list(cons(_,Xs)) :- list(Xs).
list([]).
list([_|Xs]) :- list(Xs).
member(X, [X|_]).
member(X,[_|Ys]) :- member(X, Ys).




% Signature: sub_list(Sublist, List)/2
% Purpose: All elements in Sublist appear in List in the same order.
% Precondition: List is fully instantiated (queries do not include variables in their second argument).
sub_list([], Y) :- list(Y).
sub_list([X|Xs], [X|Ys]) :- sub_list(Xs, Ys).
sub_list([X|Xs], [_|Ys]) :- sub_list([X|Xs], Ys).





binary_tree(void).
binary_tree(tree(_Element,Left,Right)) :- binary_tree(Left), binary_tree(Right).

tree_member(X,tree(X,_,_)).
tree_member(X, tree(_,Left,_)) :- tree_memeber(X,Left).
tree_member(X, tree(_,_,Right)) :- tree_memeber(X,Right).



% Signature: sub_tree(Subtree, Tree)/2
% Purpose: Tree contains Subtree.
sub_tree(tree(X, Y, Z), tree(X, Y, Z)).
sub_tree(tree(X, Y, Z), tree(_, L, _)) :- binary_tree(L), sub_tree(tree(X, Y, Z), L).
sub_tree(tree(X, Y, Z), tree(_, _, R)) :- binary_tree(R), sub_tree(tree(X, Y, Z), R).





% Signature: swap_tree(Tree, InversedTree)/2
% Purpose: InversedTree is the �mirror� representation of Tree.
swap_tree(void, void).
swap_tree(tree(E, L, R), tree(E, X, Y)) :- swap_tree(L, Y), swap_tree(R, X).
