// Copyright (c) 2023, Tridotstech and contributors
// For license information, please see license.txt

frappe.ui.form.on('Work Planning', {
	refresh: function (frm) {
		frm.rendom__id = Math.floor(Math.random() * 1000);
		if (frm.doc.docstatus == 1) {
			frm.set_df_property("blanking_entry_section", "hidden", 1)
			frm.trigger("append_jc_and_wo")
		}
		frappe.call({
			method: 'shree_polymer_custom_app.shree_polymer_custom_app.doctype.work_planning.work_planning.get_work_mould_filters',
			args: {
			},
			freeze: true,
			callback: function (r) {
				if (r && r.status == "success") {
					frm.set_query("item_produced", function () {
						return {
							"filters": {
								"item_group": r.message.item_group
							}
						};
					});
					frm.set_query("mould", function () {
						return {
							"filters": {
								"item_group": r.message.mould_item_group
							}
						};
					});

					let work_station_filter_val = []
					if (r.message.work_station && r.message.work_station.length != 0) {
						r.message.work_station.map(res => {
							work_station_filter_val.push(res.work_station)
						})
					}
					frm.set_query("work_station", function () {
						return {
							"filters": [
								["Workstation", "name", "in", work_station_filter_val]
							]
						};
					});

					// Child doc link filters
					frm.set_query('mould', 'items', () => {
						return {
							"filters": {
								"item_group": r.message.mould_item_group
							}
						};
					});
					frm.set_query('item_produced', 'items', () => {
						return {
							"filters": {
								"item_group": r.message.item_group
							}
						};
					});
					frm.set_query("work_station", 'items', function () {
						return {
							"filters": [
								["Workstation", "name", "in", work_station_filter_val]
							]
						};
					});
				}
			}
		});
		if(frm.doc.docstatus == 0){
			$('button[data-fieldname="add"]').attr("disabled","disabled");
		}
	},
	"add": function (frm) {
		var valid_form = 1;
		if (frm.doc.item_produced == "" || frm.doc.item_produced == undefined) {
			frappe.msgprint("Please choose Item Produced");
			valid_form = 0;
			return false;
		}
		if (frm.doc.mould == "" || frm.doc.mould == undefined) {
			frappe.msgprint("Please choose Work Station.");
			valid_form = 0;
			return false;
		}
		if (frm.doc.work_station == "" || frm.doc.work_station == undefined) {
			frappe.msgprint("Please choose Mould.");
			valid_form = 0;
			return false;
		}
		if (valid_form == 1) {
			var row = frappe.model.add_child(frm.doc, "Work Plan Item", "items");
			row.item = frm.doc.item_produced;
			row.mould = frm.doc.mould;
			row.work_station = frm.doc.work_station;
			frm.refresh_field('items');
			frm.set_value("item_produced", "");
			frm.set_value("mould", "");
			frm.set_value("work_station", "");
			$('button[data-fieldname="add"]').attr("disabled","disabled");
		}
	},
	"work_station": (frm) => {
		if (frm.doc.work_station) {
			if (frm.doc.items) {
				for (let i = 0; i < frm.doc.items.length; i++) {
					if (frm.doc.items[i].work_station == frm.doc.work_station) {
						frm.set_value("work_station", "")
						refresh_field("work_station")
						frappe.validated = false
						frappe.throw("The <b>Press</b> is already added for the shift.")
					}
				}
			}
		}
	},
	"mould": (frm) => {
		if (frm.doc.mould) {
			var check_valid = true;
			if (frm.doc.items) {
				for (let i = 0; i < frm.doc.items.length; i++) {
					if (frm.doc.items[i].mould == frm.doc.mould) {
						frm.set_value("mould", "")
						refresh_field("mould")
						frappe.validated = false;
						check_valid = false;
						frappe.throw("The <b>Mould</b> is already added for the shift.")
					}
				}
				
			}
			if(check_valid){
				if(frm.doc.item_produced && frm.doc.work_station){
					$('button[data-fieldname="add"]').removeAttr("disabled");
				}

			}
		}
	},
	"item_produced":(frm) => {
		if(frm.doc.item_produced=="" || !frm.doc.item_produced){
			$('button[data-fieldname="add"]').attr("disabled","disabled");
		}
		if(frm.doc.item_produced && frm.doc.work_station && frm.doc.mould){
			$('button[data-fieldname="add"]').removeAttr("disabled");
		}
	},
	"work_station":(frm) => {
		if(frm.doc.work_station=="" || !frm.doc.work_station){
			$('button[data-fieldname="add"]').attr("disabled","disabled");
		}
		if(frm.doc.item_produced && frm.doc.work_station && frm.doc.mould){
			$('button[data-fieldname="add"]').removeAttr("disabled");
		}
	},
	"append_jc_and_wo": (frm) => {
		if (!frm.doc.job_card_wo) {
			frm.add_custom_button(__('Create Work Order/Job Card'), function () {
				frappe.call({
					method: 'shree_polymer_custom_app.shree_polymer_custom_app.doctype.work_planning.work_planning.submit_workplan',
					args: {
						"docname": frm.doc.name,
						"doctype": frm.doc.doctype
					},
					freeze: true,
					callback: function (r) {
						if(r && r.status == "success"){
							frappe.show_alert({
								message:__(`Work Order / Job Card created successfully.`),
								indicator:'green'
							}, 5);
							cur_frm.reload_doc()
						}	
						else{
							frappe.show_alert({
								message:__(`Work Order / Job Card creation failed.`),
								indicator:'red'
							}, 5);
						}
					}
				});
			});
		}
		else if(frm.doc.job_card_wo){
			// frm.add_custom_button(__("Print Job Card"),() =>{
			// 	frm.dialog = new frappe.ui.Dialog({
			// 		title:"Pick Job Card",
			// 		fields: [
			// 			{
			// 				'fieldname': 'job_card_list_html',
			// 				'fieldtype': 'HTML'
			// 			}
			// 		]
			// 	})
			// 	frm.job_wrapper = frm.dialog.fields_dict.job_card_list_html.$wrapper
			// 	frm.events.render_jobcard_list(frm)
			// 	frm.dialog.set_primary_action(__('Print/Download'), function () {
			// 		frm.events.print_job_card(frm)
			// 	})
			// 	frm.dialog.show();
			// });
		}
	},
	render_jobcard_list(frm){
		frm.job_wrapper.html(`<div class="main-div" id='job_card_${frm.rendom__id}'>
								<div class="sub-div">
								</div>
							  </div>`)
		if(frm.doc.items && frm.doc.items.length>0){
			let html = `<div class="table-headers" style="height: 35px;align-items: center;border-left: 1px solid #EBEEF0;border-right: 1px solid #EBEEF0;border-top: 1px solid #EBEEF0;display:flex;gap:25px;">
							<div style="height: 35px;padding: 3px 0px 0 5px;border-right: 1px solid #EBEEF0;flex:0 0 calc(10% - 25px);"></div>
							<div style="padding-top: 7px;height: 35px;border-right: 1px solid #EBEEF0;flex:0 0 calc(20% - 25px);font-weight: 600;font-size: 14px;">Lot No.</div>
							<div  style="flex:0 0 calc(70% - 25px);font-weight: 600;font-size: 14px;">Job Card No.</div>
						</div>`
			frm.doc.items.map((res,idxx) =>{
				html += `<label class="each-row-job-card" style="${idxx == frm.doc.items.length-1?'border-bottom: 1px solid #EBEEF0;':''}margin: 0;height: 35px;align-items: center;border-left: 1px solid #EBEEF0;border-right: 1px solid #EBEEF0;border-top: 1px solid #EBEEF0;display:flex;gap:25px;cursor: pointer;" id="${res.job_card}">
							<label style="height: 35px;padding: 3px 0px 0 5px;border-right: 1px solid #EBEEF0;margin: 0;cursor:pointer;display:flex;align-items:center;gap:25px;flex:0 0 calc(10% - 25px);">		
								<div class="job-card-check">
										<input type="checkbox" class="job-card-check-box" value="${res.job_card}">
								</div>	
							</label>			
							<div class="lot-no" style="padding-top: 7px;height: 35px;border-right: 1px solid #EBEEF0;flex:0 0 calc(20% - 25px);"> <span>${res.lot_number}</span> </div>							
							<div class="job-card-id" style="flex:0 0 calc(70% - 25px);">${res.job_card}</div>	
						</label>`
			})
			frm.job_wrapper.find(`#job_card_${frm.rendom__id}`).find(".sub-div").html(html)
		}	
		else{
			frm.job_wrapper.find(`#job_card_${frm.rendom__id}`).find(".sub-div").html(`<div style='text-align:center;position:relative;height:20vh'>
			<div class="no-results-founds" style='position:absolute;top:25%;left:32%'>
			<i class='fa fa-search' style='font-size:40px;color:#9ea5ac;'></i>
						<p style="margin-top:10px;font-size:16px;">No Jobs Cards found..!</p></div></div>`)
		}
	},
	print_job_card(frm){
		frm.checked_job_cards = []
		frm.api_values = '['
			if(frm.doc.items && frm.doc.items.length>0){
				frm.doc.items.map((res,idxx) =>{
					if($(`#job_card_${frm.rendom__id} #${res.job_card} input`).is(":checked")==true){
						frm.checked_job_cards.push(res.job_card)
						frm.api_values +=`"${res.job_card}",`
					}
				})
			}
			if(frm.checked_job_cards.length>0){
				frm.api_values = frm.api_values.substring(0,frm.api_values.length-1)
				frm.api_values +="]"
				frappe.call({
					method: 'shree_polymer_custom_app.shree_polymer_custom_app.doctype.work_planning.work_planning.get_work_mould_filters',
					args: {
					},
					freeze: true,
					callback: function (r) {
						if(r && r.status == "success"){
							let print_format = r.message.job_card_print_format
							let url = window.location.origin 
							let api_call = `/api/method/frappe.utils.print_format.download_multi_pdf?doctype=Job Card&name=${frm.api_values}&format=${print_format}&no_letterhead=1&letterhead=No Letterhead&options={"page-size":"A4"}`
							window.open(url+api_call)
						}	
						else{
							frappe.validated = false
							frappe.throw("Print Format fetch error.")
						}	
					}
				})
			}
			else{
				frappe.msgprint("Please select any one of the Job Card.!")
			}
	}
});
