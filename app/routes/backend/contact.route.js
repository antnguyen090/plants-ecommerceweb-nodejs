var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
const {body, validationResult} = require('express-validator');
var util = require('util')

const mainName = "contact"
const pageTitle = `Contact Management`
const systemConfig = require(__path_configs + 'system');
const linkIndex = '/' + systemConfig.prefixAdmin + '/' + mainName;
const serviceContact = require(__path_services_backend + `${mainName}.service`);
const notify = require(__path_configs + 'notify');
const layout = __path_views_backend + 'backend';

const UtilsHelpers = require(__path_helpers + 'utils');
const ParamsHelpers = require(__path_helpers + 'params');
const folderView = __path_views_backend + `/pages/${mainName}/`;

// List items
router.get('(/status/:status)?', async (req, res, next) => {
	try {
		let inform = req.flash()
    let objWhere = {};
    let keyword = ParamsHelpers.getParam(req.query, 'keyword', '');
    let currentStatus = ParamsHelpers.getParam(req.params, 'status', 'all');
    let statusFilter = await UtilsHelpers.createFilterStatus(currentStatus, `${mainName}.model`);
    let pagination = {
        totalItems: 1,
        totalItemsPerPage: 10,
        currentPage: parseInt(ParamsHelpers.getParam(req.query, 'page', 1)),
        pageRanges: 3
    };

    if (currentStatus !== 'all') objWhere.status = currentStatus;
    if (keyword !== '') objWhere.name = new RegExp(keyword, 'i');
    pagination.totalItems = await serviceContact.countItem(objWhere);

			let data = await serviceContact.listItems(objWhere, 
				pagination.currentPage,
				pagination.totalItemsPerPage,
				{updatedAt: 'desc'},
				)
			statusFilter.map( item =>{
				if(item.class == "danger"){
					item.name = "Incomplete"
				} else if(item.class == "success"){
					item.name = "Complete"
				}
			})
			res.render(`${folderView}list`, {
				pageTitle: pageTitle,
				countItemsActive: data.filter(item => item.status === 'active'),
				items: data,
				statusFilter,
				pagination,
				currentStatus,
				keyword,
				inform: inform,
				layout,
			})
	} catch (error) {
		console.log(error)
	}
})

// access FORM
router.get('/form/', async function (req, res, next) {
	try {
		let inform = req.flash()
		let main = {pageTitle: pageTitle,
		inform: inform
		}
    res.render(`${folderView}form`, {
			pageTitle,
			main: main,
			item: [],
			layout,
        });
	} catch (error) {
		console.log(error)
	}
});


router.post('/save/(:id)?',
	body('name')
		.isLength({min: 2, max: 100})
		.withMessage(util.format(notify.ERROR_NAME,2,100)),
	body('ordering')
		.isInt({min: 0, max: 99})
		.withMessage(util.format(notify.ERROR_ORDERING,0,99)),
	body('status').not().isIn(['novalue']).withMessage(notify.ERROR_STATUS),
	body('subject')
		.not()
		.isEmpty()
		.withMessage(notify.ERROR_SUBJECT),
	body('email')
		.isEmail()
		.withMessage(notify.ERROR_EMAIL),
		body('message')
		.not()
		.isEmpty()
		.withMessage(notify.ERROR_MESSAGE),
	async function (req, res) { // Finds the validation errors in this request and wraps them in an object with handy functions
			try {
				let item = req.body;
				let errors = await validationResult(req)
				if(!errors.isEmpty()) {
					let main = {pageTitle: pageTitle,
								showError: errors.errors,
								}
						res.render(`${folderView}form`, {
							pageTitle,
							main: main,
							item: item,
							layout,
						})
					} else{
						let data = await serviceContact.saveItems(item);
						req.flash('success', notify.ADD_SUCCESS);
						res.redirect(linkIndex);
					}
			} catch (error) {
				console.log(error)
			}
});

router.post('/change-status/(:status)?',
async (req, res, next) => {
	try {
			let {status, id} = req.body
			status = (status == 'active') ? 'inactive' : 'active'
			if(status == 'inactive'){
				res.send({success: false})
			} else{
				let changeStatus = await serviceContact.changeStatus(id, status)
				res.send({success: true, update: changeStatus.updatedAt})
			}
	} catch (error) {
		res.send({success: false})
	}

});

router.post('/change-ordering', 
	body('ordering')
		.isInt({min: 0, max: 99})
		.withMessage(util.format(notify.ERROR_ORDERING,0,99)), 
	async (req, res, next) => {
		const errors = validationResult(req);
		if (! errors.isEmpty()) {
			res.send({success: false, errors: errors})
			return
		}
		let {ordering, id} = req.body
		let changeStatus = await serviceContact.changeOrdering(id, ordering)
		res.send({success: true})
});


module.exports = router;
