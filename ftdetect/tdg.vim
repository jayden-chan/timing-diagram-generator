" vint: -ProhibitAutocmdWithNoGroup

autocmd BufRead,BufNewFile *.tdg call s:set_tdg_filetype()

function! s:set_tdg_filetype() abort
    if &filetype !=# 'tdg'
        set filetype=tdg
    endif
endfunction

" vim: set et sw=4 sts=4 ts=8:
