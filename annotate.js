/* annotate.js */

function annotate(stmt, env) {
    return is_number(stmt) // prim
        ? make_number_node(stmt)
        : is_boolean(stmt) // prim
        ? make_boolean_node(stmt)
        : is_undefined(stmt) // prim
        ? make_undefined_node()
        : is_string(stmt) // prim
        ? make_string_node(stmt)
        : is_name(stmt)
        ? annotate_name(stmt, env)
        : is_constant_declaration(stmt)
        ? annotate_constant_declaration(stmt, env)
        : is_conditional_expression(stmt)
        ? // TODO: change the name to conditional_statement
          annotate_conditional_expression(stmt, env)
        : is_sequence(stmt)
        ? annotate_sequence(stmt, env)
        : is_application(stmt)
        ? annotate_application(stmt, env)
        : is_function_definition(stmt)
        ? annotate_function_definition(stmt, env)
        : is_block(stmt)
        ? annotate_block(stmt, env)
        : is_return_statement(stmt)
        ? annotate_return_statement(stmt, env)
        : error(stmt, "Unknown statement type in annotate: ");
}

function annotate_name(stmt, env) {
    // assume name is declared before being called
    const type_var = lookup_type(name_of_name(stmt), env);
    return list_add(stmt, 2, type_var);
}

function annotate_block(stmt, env) {
    const body = block_body(stmt);
    const locals = local_names(body);
    const block_env = extend_environment(
        locals,
        build_list(length(locals), _ => make_new_T_type(fresh_T_var())),
        env
    );
    return list(
        "block",
        annotate(body, block_env),
        make_new_T_type(fresh_T_var())
    );
}

function annotate_return_statement(stmt, env) {
    return list(
        "return_statement",
        annotate(return_statement_expression(stmt), env),
        make_new_T_type(fresh_T_var())
    );
}

function annotate_function_definition(stmt, env) {
    const parameters = function_definition_parameters(stmt);
    const body = function_definition_body(stmt);
    const locals = local_names(body);
    const param_names = function_definition_parameters_names(stmt);

    const temp_values = map(_ => no_value_yet, locals);
    const param_types = build_list(length(param_names), _ =>
        make_new_T_type(fresh_T_var())
    );
    const func_env = extend_environment(
        insert_all(param_names, locals),
        append(param_types, temp_values),
        env
    );

    return list(
        "function_definition",
        map(name => annotate(name, func_env), parameters),
        annotate(body, func_env),
        make_new_T_type(fresh_T_var())
    );
}

function annotate_application(stmt, env) {
    let annotated_operator = annotate(operator(stmt), env);

    // HACK: explicitly handling minus operator
    // TODO: retain minus sign line number and loc
    if (
        name_of_name(annotated_operator) === "-" &&
        length(operands(stmt)) === 1
    ) {
        annotated_operator = annotate(list("name", "-1"), env);
    } else {
    }

    return list(
        "application",
        annotated_operator,
        map(opd => annotate(opd, env), operands(stmt)),
        make_new_T_type(fresh_T_var())
    );
}

function annotate_conditional_expression(stmt, env) {
    return list(
        "conditional_statement",
        annotate(cond_expr_pred(stmt), env),
        annotate(cond_expr_cons(stmt), env),
        annotate(cond_expr_alt(stmt), env),
        make_new_T_type(fresh_T_var())
    );
}

function annotate_sequence(stmt, env) {
    return list(
        "sequence",
        map(stmt => annotate(stmt, env), sequence_statements(stmt)),
        make_new_T_type(fresh_T_var()) // the type of the entire sequence
    );
}

function annotate_constant_declaration(stmt, env) {
    set_type(
        constant_declaration_name(stmt),
        make_new_T_type(fresh_T_var()), // the type of the entire sequence
        env
    );
    return list(
        "constant_declaration",
        annotate(list_ref(stmt, 1), env),
        annotate(list_ref(stmt, 2), env),
        make_new_T_type(fresh_T_var()) // essentially undefined, left for compatibility
    );
}

function annotate_top_level(stmt) {
    const top_level_names = local_names(stmt);
    const program_env = extend_environment(
        top_level_names,
        build_list(length(top_level_names), _ => no_value_yet),
        the_global_environment
    );

    return annotate(stmt, program_env);
}
