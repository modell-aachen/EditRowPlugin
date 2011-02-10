(function($) {
    $.editable.addInputType('datepicker', {
	element : function(settings, original) {
	    var input = $('<input>');
	    if (settings.width  != 'none')
		input.width(settings.width);
	    if (settings.height != 'none')
		input.height(settings.height);
	    input.attr('autocomplete', 'off');
	    $(this).append(input);
	    return(input);
	},
	plugin : function(settings, original) {
	    /* Workaround for missing parentNode in IE */
	    var form = this;
	    settings.onblur = 'ignore';
	    $(this).find('input').datepicker({
		firstDay: 1,
		dateFormat: $.datepicker.W3C,
		closeText: 'X',
		onSelect: function(dateText) {
		    $(this).hide();
		    $(form).trigger("submit");
		},
		onClose: function(dateText) {
		    original.reset.apply(form, [settings, original]);
		    $(original).addClass( settings.cssdecoration );
		},
	    });
	}});

    $.editable.addInputType('radio', {
        element : function(settings, original) {
	    // 'this' is the form
	    var hinput = $('<input type="hidden" id="' + settings.name
			   + '" name="' + settings.name + '" value="" />');
	    // *Must* be first
	    $(this).append(hinput);
	    var key, input, checked, id, cnt = 1;
	    for (key in settings.data) {
		id = settings.name + "_button" + cnt;
		$(this).append('<label for="' + id + '">' + settings.data[key] + '</label>');
		checked = (key === settings.text) ? ' checked="checked"' : "";
		input = $('<input type="radio" name="' + settings.name +
			  '_buttons" id="' + id + '"' + checked + ' value="'
			  + key + '" />');
		$(this).append(input);
		input.click(function() {
		    $('#' + settings.name).val($(this).val());
		});
		cnt++;
	    }
            return hinput;
        }
    });

    $.editable.addInputType('checkbox', {
        element : function(settings, original) {
	    // 'this' is the form
	    // data is CSV list
	    var hinput = $('<input type="hidden" id="' + settings.name
			   + '" name="' + settings.name + '" value="" />');
	    // *Must* be first
	    $(this).append(hinput);
	    var key, input, checked, id, cnt = 1;
	    var picked = new RegExp("\\b(" + settings.text.replace(/\s*,\s*/, "|") + ")\\b");
	    for (key in settings.data) {
		id = settings.name + "_button" + cnt;
		checked = picked.test(key) ? ' checked="checked"' : '';
		input = $('<input type="checkbox" name="' + settings.name +
			  '_buttons" id="' + id + '"' + checked + ' value="'
			  + key + '" />');
		$(this).append(input);
		$(this).append('<label for="' + id + '">' + settings.data[key] + '</label>');
		input.change(function() {
		    // The :checked selector doesn't work :-(
		    var vs = 'input[name="' + settings.name + '_buttons"]';
		    var vals = [];
		    $(vs).each(function(i, e) {
			if ($(e).attr("checked"))
			    vals.push($(e).val());
		    });
		    $('#' + settings.name).val(vals.join(','));
		});
		cnt++;
	    }
            return hinput;
	}
    });

    // $.metadata() ignoring the cache
    $.fn.myMeta = function() {
 	var oc = $(this).attr("class");
	var m = /({.*})/.exec(this.attr("class"));
	if (!m) return null;
	return eval('(' + m[1] + ')');
    }

     var setMetadata = function(e, keys, v) {
	var obj = $(e).myMeta();
	var i, fld = obj;
	for (i = 0; i < keys.length - 1; i++)
	    fld = fld[keys[i]];
	fld[keys[keys.length - 1]] = v;
	var oc = $(e).attr("class");
	$(e).attr("class", oc.replace(/{.*}/, $.toJSON(obj)));
    };

    $(document).ready(function() {
	var erp_rowDirty = false;

	$('.editRowPluginInput').livequery("change", function() {
	    erp_rowDirty = true;
	});

	// Action on select row and + row. Check if the current row is dirty, and
	// if it is, prompt for save
	$('.editRowPlugin_willDiscard').livequery("click", function() {
	    if (erp_rowDirty) {
		if (!confirm("This action will discard your changes.")) {
		    return false;
		}
	    }
	    return true;
	});

	$('.erp_submit').livequery("click", function() {
	    var form = $(this).closest("form");
	    if (form && form.length > 0) {
		form[0].erp_action.value = $(this).attr('href');
		form.submit();
		return false;
	    }
	    return true;
	}).button();

	$('.editRowPluginSort').livequery("click", function() {
	    var m = /{(.*)}/.exec(this.attr("class"));
	    var md = {};
	    if (m)
		md = eval('({' + m[1] + '})');
	    return sortTable(this, false, md.headrows, md.footrows);
	});

	$(".editRowPluginCell").livequery(function() {
	    // WARNING: this was a complete PITA to get right! Meddle at your own peril!

	    // Make the containing row draggable
	    var tr = $(this).closest("tr");
	    if (!tr.hasClass('ui-draggable')) {
		// only once per row
		var dragee, container, rows;

		var onDrop = function( event, ui ) {
		    var target = $(this);
		    var edge;
		    // A drop outside the table
		    // is triggered on the drag helper instead of the
		    // droppable at the end of the table.
		    if (target.hasClass("drag-helper")) {
			var top = rows.first().offset().top;
			var posY = event.pageY - top;
			edge = (posY < (rows.last().offset().top() +
					rows.last().height() - top) / 2)
			    ? 'top' :'bottom';
			if (edge == 'top')
			    target = rows.first();
			else
			    target = rows.last();
		    } else {
			var posY = event.pageY - target.offset().top;
			edge = (posY < target.height() / 2)
			    ? 'top' :'bottom';
		    }
		    var old_pos = dragee.myMeta().erp_data.erp_active_row;
		    var new_pos = target.myMeta().erp_data.erp_active_row;
		    if (edge == 'bottom')
			new_pos++;

		    if (new_pos == old_pos)
			return;

		    // Send the good news to the server
		    dragee.fadeTo("slow", 0.0); // to show it's being moved
		    container.css("cursor", "wait");
		    var p = $(this).myMeta();
		    p.erp_data.erp_action = 'erp_moveRow';
		    p.erp_data.old_pos = old_pos;
		    p.erp_data.new_pos = new_pos;
		    $.ajax({
			url: p.url,
			type: "POST",
			data: p.erp_data,
			success: function() {
			    if (edge == 'top')
				dragee.insertBefore(target);
			    else
				dragee.insertAfter(target);

			    // Renumber the rows. Need to re-find the rows as the
			    // order has changed
			    rows = container.find(".editRowPluginRow");
			    rows.each(function(ri, re) {
				if ($(re).myMeta()) {
				    setMetadata($(re), ['erp_data', 'erp_active_row'],
						ri + 1);
				    $(re).find(".editRowPluginCell").each(
					function(ci, ce) {
					    if ($(ce).myMeta())
						setMetadata($(ce),
							    ['erp_data', 'erp_active_row'],
							    ri + 1);
					});
				}
			    });
			    dragee.fadeTo("fast", 1.0);
			    container.css("cursor", "auto");
			},
			error: function() {
			    dragee.fadeTo("fast", 1.0);
			    container.css("cursor", "auto");
			}
		    });
		};

		tr.draggable({
		    // constrain to the container
		    containment: $(this).closest("tbody,thead,table"),
		    axis: 'y',
		    helper: function(event) {
			var helper = $(event.target).closest('tr').clone();
			return $('<div><table></table></div>')
			    .find('table')
			    .append(helper.addClass("drag-helper"))
			    .end();
		    },
		    start: function(event, ui) {
			dragee = $(this);
			dragee.fadeTo("fast", 0.3); // to show it's moving
			container = dragee.closest("table");
			rows = container.find(".editRowPluginRow");
			rows.not(dragee).not('.drag-helper').droppable({
			    drop: onDrop
			});
		    },
		    stop: function() {
			dragee.fadeTo("fast", 1.0);
		    }
		});
	    }

	    var p = $(this).myMeta();

	    if (!p.type || p.type == 'label')
		return;

	    if (!p.tooltip)
		p.tooltip = 'Click to edit...';
	    p.onblur = 'cancel';

	    // We can't row-number when generating the table because it's done by the
	    // core table rendering. So we have to promote the cell information up
	    // to the row when we have it.
	    if (!tr.hasClass('editRowPluginRow') && p.erp_data
		&& p.erp_data.erp_active_row) {
		var m = /({.*})/.exec($(this).attr("class"));
		var metadata = m[1];
		tr.addClass("editRowPluginRow " + metadata);
	    }

	    // use a function to get the submit data from the class attribute, because
	    // the row index may change if rows are moved/added/deleted
	    p.submitdata = function(value, settings) {
		var sd = $(this).myMeta().erp_data;
		sd.erp_action = 'erp_saveCell';
		return sd;
	    }

            if (p.type == "text" || p.type == "textarea") {
		// Add changed text (unexpanded) to meta
		p.callback = function(value, settings) {   
		    setMetadata($(this), ['data'], value);
		};
	    }

	    $(this).editable(p.url, p);
 	});
    });
})(jQuery);
