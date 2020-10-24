" Vim syntax file
" Language: Timing Diagram Generator
" Maintainer: Jayden Chan
" Latest Revision: Oct 23 2020

if exists("b:current_syntax")
    finish
endif

syn region tdgQuotedString start=/\v"/ skip=/\v\\./ end=/\v"/
syn match tdgNumber '[0-9]\+'
syn match tickNumber 'T[0-9]\+' nextgroup=tdgQuotedString skipwhite
syn match tdgArrow '->'
syn keyword tdgBasicKeyword lifeline state nextgroup=tdgQuotedString skipwhite
syn keyword tdgBasicKeyword state nextgroup=tdgQuotedString,tdgQuotedString skipwhite
syn keyword tdgTitleKeyword title nextgroup=tdgQuotedString skipwhite
syn match tdgLabelAlignL ':\zsL$'
syn match tdgLabelAlignR ':\zsR$'

syn keyword tdgTodo contained TODO FIXME XXX NOTE
syn match tdgComment "#.*$" contains=tdgTodo

let b:current_syntax = "tdg"

hi def link tdgSingleApos   Error
hi def link tdgTodo         Todo
hi def link tdgComment      Comment
hi def link tdgArrow        Operator
hi def link tdgNumber       Constant
hi def link tickNumber      Statement
hi def link tdgBasicKeyword Type
hi def link tdgTitleKeyword Statement
hi def link tdgQuotedString String
hi def link tdgLabelAlignR  Type
hi def link tdgLabelAlignL  Type
