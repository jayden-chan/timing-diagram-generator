" Vim syntax file
" Language: Timing Diagram Generator
" Maintainer: Jayden Chan
" Latest Revision: Mar 3 2022

if exists("b:current_syntax")
    finish
endif

syn region tdgQuotedString start=/\v"/ skip=/\v\\./ end=/\v"/

syn match tdgConVar '[A-Z_]\+'
syn match tdgVar '[A-Za-z1-9_]\+' nextgroup=tdgQuotedString
syn match tdgNumber '[0-9]\+'
syn match tickNumber 'T[0-9]\+' nextgroup=tdgQuotedString skipwhite
syn match tdgArrow '->'
syn match tdgLabelAlignL ':\zsL$'
syn match tdgLabelAlignR ':\zsR$'

syn keyword tdgConVal Simplified
syn keyword tdgConVal Normal
syn keyword tdgConVal Slice
syn keyword tdgConVal significant
syn keyword tdgConVal freq

syn keyword tdgTitleKeyword default

syn keyword tdgBasicKeyword config nextgroup=tdgConVar skipwhite
syn keyword tdgBasicKeyword lifeline span nextgroup=tdgQuotedString skipwhite
syn keyword tdgBasicKeyword state style nextgroup=tdgQuotedString,tdgQuotedString skipwhite
syn keyword tdgTitleKeyword title nextgroup=tdgQuotedString skipwhite
syn keyword tdgTitleKeyword var nextgroup=tdgVar skipwhite

syn keyword tdgTodo contained TODO FIXME XXX NOTE
syn match tdgComment "#.*$" contains=tdgTodo

let b:current_syntax = "tdg"

hi def link tdgTodo         Todo
hi def link tdgComment      Comment
hi def link tdgArrow        Operator
hi def link tdgNumber       Constant
hi def link tdgConVar       Constant
hi def link tdgConVal       Constant
hi def link tickNumber      Statement
hi def link tdgBasicKeyword Type
hi def link tdgTitleKeyword Statement
hi def link tdgQuotedString String
hi def link tdgLabelAlignR  Type
hi def link tdgLabelAlignL  Type
