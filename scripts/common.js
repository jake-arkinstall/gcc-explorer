function curry(func, ...base_args){
    return function(...new_args){
        return func(...base_args, ...new_args);
    }
}