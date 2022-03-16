function update_progress_bar(element, step, total) {
    element.attr({'max': total, 'value': step});
}

function toggle(parent_element, foldable) {
    $(`*[data-foldable="${foldable}"]`, parent_element).toggleClass("unfolded folded");
    $(foldable).slideToggle();
}

function enable_fold_triggers(parent_element) {
    $('*[data-foldable]', parent_element).click(function () {
        toggle(parent_element, $(this).data('foldable'));
        return false;
    });
}



$('.gcc-explorer').each(function (_, explorer_container) {
    const context = $(explorer_container);
    const progress_bar = context.children('progress').eq(0);
    const controls = context.children('.controls').eq(0);
    const output = context.children('.output').eq(0);
    const form = context.children('form').eq(0);
    $('button[data-action="back-to-form"]', controls).click(function () {
        controls.fadeOut();
        output.slideUp(200, function () {
            form.slideDown(200);
            output.empty();
        });
    });
    $('button[data-action="toggle-syspaths"]', controls).click(function () {
        const syslinks = $('a.system', output);
        syslinks.parent('li').slideToggle();
        syslinks.parent('span').parent('li').slideToggle();
    })
    form.submit(function () {
        try {
            form.slideUp();
            const error_log = this.compiler_log.value;
            let launcher_format = this.launcher_format.value;
            if (launcher_format === 'custom') {
                launcher_format = this.launcher_format_custom.value;
            }
            const project_root = this.project_root.value;
            progress_bar.show();
            const result = prettify(error_log, launcher_format, project_root,
                curry(update_progress_bar, progress_bar));
            output.empty().append(result);
            PR.prettyPrint();
            enable_fold_triggers(output);
            controls.fadeIn();
            output.slideDown();
            progress_bar.fadeOut('slow');
        } catch (e) {
            console.error(e);
        }
        return false;
    });
    form.find('select[name="launcher_format"]').eq(0).change(function () {
        const element = form.find('input[name="launcher_format_custom"]').parent()
        if (this.value === 'custom') {
            element.slideDown();
        } else {
            element.slideUp();
        }
    }).trigger('change');

    $('*[aria-describedby]', form).each(function () {
        const to_reveal = $(this).attr('aria-describedby')
        const revealer = $('<span>')
            .addClass("helper-reveal")
            .text("[help]")
            .click(function () {
                $(`#${to_reveal}`).slideToggle();
                return false;
            });
        $(this).append(revealer);
    })
});
const page_theme = $('#page-theme');
const code_theme = $('#code-theme');
$('#theme-toggle').click(function () {
    const current_theme = page_theme.attr('href').match(/dark|light/)[0];
    const new_theme = "darklight".replace(current_theme, "")
    const new_page_theme = `style/${new_theme}/page.css`
    const new_code_theme = `style/${new_theme}/code.css`
    page_theme.attr({'href': new_page_theme});
    code_theme.attr({'href': new_code_theme});
});
