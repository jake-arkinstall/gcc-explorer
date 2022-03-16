let next_foldable_id = 0;
// < and > are valid C++ chars so we don't want to parse HTML tags on subsequent replacements
// so instead we use these tokens, replacing them afterwards
const code_start = '%code_start'
const code_end = '%code_end'
const sublist_start_braces = '%sublist_start_braces%';
const sublist_start_parens = '%sublist_start_parens%';
const sublist_start_square = '%sublist_start_square%';
const sublist_start_angle = '%sublist_start_angle%';
const specialisation_table_start = '%specialisation_table_start%';
const specialisation_table_end = '%specialisation_table_end%';
const specialisation_row_start = '%specialisation_row_start%';
const specialisation_row_end = '%specialisation_row_end%';
const specialisation_cell_start = '%specialisation_cell_start%';
const specialisation_cell_end = '%specialisation_cell_end%';
const sublist_start_all = /%sublist_start_([a-z]+)%/g;
const sublist_end = '%sublist_end%';
const list_element_start = '%list_element_start%';
const list_element_end = '%list_element_end%';

function tokenise(log_contents) {
    let x = log_contents
    let tail = ""
    // find '... [with x=y; z=...] lists and create tables
    x = x.replace(/ \[with (.+)]/, function (_, list) {
        let result = "";
        $.each(list.split('; '), function (_, row) {
            result += row.replace(/^(.+) = (.+)$/, function (_, label, value) {
                return specialisation_row_start +
                       specialisation_cell_start + tokenise(label) + specialisation_cell_end +
                       specialisation_cell_start + tokenise(value) + specialisation_cell_end + 
                       specialisation_row_end;
            });
        });
        tail = specialisation_table_start + result + specialisation_table_end;
        return "";
    });
    // a comma creates a new list element
    x = x.replaceAll(',', ',' + list_element_end + list_element_start);
    x = x.replaceAll(';', ';' + list_element_end + list_element_start);
    // an open brace creates a sublist - designate the character
    x = x.replaceAll('{', clean_html('{') + sublist_start_braces + list_element_start)
    x = x.replaceAll('(', clean_html('(') + sublist_start_parens + list_element_start)
    x = x.replaceAll('[', clean_html('[') + sublist_start_square + list_element_start)
    x = x.replaceAll('<', clean_html('<') + sublist_start_angle + list_element_start)
    // a close brace closes a sublist
    x = x.replaceAll(/[\])}>]/g, x => list_element_end + sublist_end + clean_html(x));
    // replace injected tokens with HTML tags
    // note: sublists can be collapsed, so we toggle them with an fold_toggle

    return code_start + x + code_end + tail;
}

function detokenise(content) {
    content = content.replaceAll(code_start, '<code class="prettyprint">');
    content = content.replaceAll(code_end, '</code>');
    content = content.replaceAll(/%sublist_start_[a-z]+%\s*%list_element_start%([^%]*)%list_element_end%\s*%sublist_end%/g, 
        (whole, x) => x
    );
    content = content.replaceAll(sublist_start_all, function () {
        const id = next_foldable_id++;
        return `<span class="fold_toggle nested folded" data-foldable="#nested_${id}"></span>` +
            `<ul class="foldable not-trivial" style="display: none" id="nested_${id}">`;
    });
    content = content.replaceAll(sublist_end, '</ul>');
    content = content.replaceAll(list_element_start, '<li><code class="prettyprint">');
    content = content.replaceAll(list_element_end, '</code></li>');
    content = content.replaceAll(specialisation_table_start, function () {
        const id = next_foldable_id++;
        return `<span class="fold_toggle specialisation folded" data-foldable="#foldable_${id}"></span>` +
            `<table class="specialisation-list foldable not-trivial" id="foldable_${id}" style="display: none">` +
            `<thead><th>Template</th><th>Value</th></thead><tbody>`
    });
    content = content.replaceAll(specialisation_table_end, '</tbody></table>');
    content = content.replaceAll(specialisation_row_start, '<tr>');
    content = content.replaceAll(specialisation_row_end, '</tr>');
    content = content.replaceAll(specialisation_cell_start, '<td>');
    content = content.replaceAll(specialisation_cell_end, '</td>');
    content = content.replaceAll(/<span[^>]*><\/span><ul[^>]*><li>([^<]*)<\/li><\/ul>/gm, "$1")
    return content;
}


function clean_html(str) {
    return he.encode(str).replaceAll(' ', '&nbsp;');
}

function strip_templates(str) {
    // a horrific approach at stripping out template arguments.
    // Find each <, and remove until the matching pair, taking into account
    // that each interior opening < will require an additional closing >.
    str = str.replace('template<', '<');
    for (let i = 0; i < str.length; ++i) {
        if (str[i] === '<') {
            let start = i;
            let nesting = 1;
            while (nesting > 0) {
                i += 1;
                if (i >= str.length) break;
                if (str[i] === '<') ++nesting;
                else if (str[i] === '>') --nesting;
            }
            str = str.substr(0, start) + str.substr(i + 1);
            i = start;
        }
    }
    return str;
}

function replace_url(tmp_launcher_format, project_root, original, file, line, column, ...args) {
    // a helper method for create_hyperlinks. Given a launcher format, project root, number of elements,
    // and regex matching information (the original match, the file, optionally the line, and optionally the column),
    // return a (mangled) anchor pointing to the hyperlink.
    if (file.search('//') >= 0) {
        return original;
    }
    const elements = args.length;
    const is_absolute = file.startsWith("/");
    const is_system = file.startsWith("/usr");
    let has_line = (elements > 0);
    let has_column = (elements > 1);
    line = has_line ? line : 1;
    column = has_column ? column : 0;
    let link_text = file;
    if (has_line) link_text += ` (line ${line})`
    if (has_column) link_text = link_text.substr(0, link_text.length - 1) + ` column ${column})`
    const abs_path = is_absolute ? file : (project_root + '/' + file)
    const href = tmp_launcher_format.replace("%file", abs_path).replace("%line", line).replace("%column", column);
    const link_type = is_absolute ? 'absolute-path' : 'relative-path';
    const link_context = is_system ? 'system' : 'local';
    return `<a href="${href}" class="${link_type} ${link_context}" target="_blank">${link_text}</a>`;
}

function create_hyperlinks(source, launcher_format, project_root) {
    // file paths may include the line and column. These are presented with the format:
    // /path/to/file:line and /path/to/file:line:column respectively.
    // In order to prevent recursion, we swap out colons from the launch format before replacing,
    // and then swap them back later.
    const tmp_launcher_format = launcher_format.replace(':', '%colon')
    const file_line_col_pattern = /([\w-./+]+\/[\w-.+]+):(\d+):(\d+)/gm
    const file_line_pattern = /([\w-./+]+\/[\w-.+]+):(\d+)/gm
    const file_pattern = /([\w-./+]+\/[\w-.+]+)(?::|,\n)/gm
    source = source.replaceAll(file_line_col_pattern,
        curry(replace_url, tmp_launcher_format, project_root));
    source = source.replaceAll(file_line_pattern,
        curry(replace_url, tmp_launcher_format, project_root));
    source = source.replaceAll(file_pattern,
        curry(replace_url, tmp_launcher_format, project_root));
    return source.replaceAll('%colon', ':');
}

function process_line(content) {
    // used for detecting lines that start with paths (to render them as header rows)
    const starts_with_path = /^[\w-./+]+\/[\w-.+]+[^ ]*/;
    let result = $('<li>');
    // if the line starts with a path, add it as a line header to the line's list element and strip it out
    // from remaining processing
    content = content.replace(starts_with_path, function (header) {
        result.append($('<span>').addClass("line-header").text(header));
        return '';
    });
    // only tokenise content that has one surrounding quote. This is a naive attempt at that
    // without fully parsing the line. The idea is that the base content is output as-is via clean_html,
    // then the content inside quotation marks are tokenised - UNLESS there is a nested quotation, in
    // which case it's output as-is. This helps with stringy-template parameters in errors like:
    $.each(content.split(/(?!\\)(['‘])/), function (chunk, value) {
        result.append((chunk % 4 === 2) ? tokenise(value) : clean_html(value));
    });
    return result;
}

function extract_issue_summary(content) {
    const match = content.match(/(error|warning|note): ([^\[\n]+)/)
    if (match) {
        return {type: match[1], text: `${match[1]}: ${strip_templates(match[2])}`}
    } else {
        return {type: "default", text: "Additional information"}
    }
}

function process_issue(id, content, hide) {
    // check the issue type - error, warning, note or default.
    // issues are foldable, and we use a header row containing the issue type and description to fold/unfold.
    const summary = extract_issue_summary(content);
    const result = $('<li>').attr('data-issue-type', summary.type);
    const is_code_block = /^\s*(\d*)\s*\|(.*)/;
    let current_code_block = [];

    const toggle_switch = $('<span>')
        .addClass("fold_toggle issue_toggle")
        .attr('data-foldable', `#issue_${id}`)
        .text(summary.text);
    const issue_line_list = $('<ol>')
        .attr('id', `issue_${id}`)
        .addClass("lines foldable issue");
    result.append(toggle_switch)
    result.append(issue_line_list);

    const line_splits = content.split('\n').filter(e => e.length > 0);
    line_splits.forEach(function(line){
        const code_match = line.match(is_code_block);
        if(code_match){
            current_code_block.push({line: parseInt(code_match[1]), content: code_match[2]})
        }else{
            if(current_code_block.length > 0){
                let code = "";
                let line_no = -1
                current_code_block.forEach(function(details){
                    if(details.line && line_no < 0){
                        line_no = details.line;
                    }
                    code += clean_html(details.content) + '<br>';
                });
                code_class = "prettyprint"
                if(line_no >= 0){
                    code_class += ` linenums:${line_no}`
                }
                issue_line_list.append(`<li><code class="${code_class}">${code}</code></li>`);
                current_code_block = [];
            }
            issue_line_list.append(process_line(line));
        }
    });
    if (hide) {
        toggle_switch.addClass('folded')
        issue_line_list.hide();
    } else {
        toggle_switch.addClass('unfolded')
    }
    return result;
}

function prettify(log_contents, launcher_format, project_root, progress_callback) {
    let result = $('<ul class="issue_list">');
    // Assume "In file included from" is a good splitting point.
    const distinct_issues = log_contents.split(/(?=In file included from |\n.* In function )/);
    // only keep the first issue open to begin with. If there are none, keep the 0th issue open.
    const leave_open = distinct_issues.length === 1 ? 0 : 1;
    $.each(distinct_issues, function (id, content) {
        result.append(process_issue(id, content, id !== leave_open));
        progress_callback(id, distinct_issues.length);
    });
    progress_callback(1, 4);
    let tmp_html = result.html()
    tmp_html = create_hyperlinks(tmp_html, launcher_format, project_root);
    progress_callback(2, 4);
    tmp_html = detokenise(tmp_html);
    progress_callback(3, 4);
    result.html(tmp_html);
    progress_callback(4, 4);
    return result;
}
