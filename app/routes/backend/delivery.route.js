var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
const {body, validationResult} = require('express-validator');
var util = require('util')

const mainName = "delivery"
const pageTitle = `Delivery Management`
const systemConfig = require(__path_configs + 'system');
const linkIndex = '/' + systemConfig.prefixAdmin + '/' + mainName;
const serviceDelivery = require(__path_services_backend + `${mainName}.service`);
const notify = require(__path_configs + 'notify');
const layout = __path_views_backend + 'backend';

const UtilsHelpers = require(__path_helpers + 'utils');
const ParamsHelpers = require(__path_helpers + 'params');
const folderView = __path_views_backend + `/pages/${mainName}/`;
const FileHelpers = require(__path_helpers + 'file');
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
		pagination.totalItems = await serviceDelivery.countItem(objWhere);

			let data = await serviceDelivery.listItems(objWhere, 
				pagination.currentPage,
				pagination.totalItemsPerPage,
				{updatedAt: 'desc'},
				)

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
router.get('/form/(:id)?', async function (req, res, next) {
	try {
		let inform = req.flash()
		let main = {pageTitle: pageTitle,
			inform: inform
		}
		if (req.params.id != undefined) {
					let item = await serviceDelivery.getItemByID(req.params.id)
					res.render(`${folderView}form`, {
						pageTitle,
						main: main,
						item: item[0],
						layout,
					});
			} else {
					res.render(`${folderView}form`, {
						pageTitle,
				main: main,
				item: [],
				layout
					});
			}
	} catch (error) {
		console.log(error)
	}
});


router.post('/save/(:id)?',
	body('province')
	  .isLength({min: 5, max: 100})
		.withMessage(util.format(notify.ERROR_NAME,5,100))
		.custom(async (val, {req}) => {
			let paramId = await(req.params.id != undefined) ? req.params.id : 0
			let data		= await serviceDelivery.checkDuplicatedName(val)
			let length = data.length
			data.forEach((value, index) => {
				if (value.id == paramId) 
					length = length - 1;
			})
			if (length > 0) {
					return Promise.reject(notify.ERROR_NAME_DUPLICATED)
			}
			return
		}),
	body('cost')
		.custom(async (val, {req}) => {
		 if(!val) return Promise.reject(notify.ERROR_COST)
		 let price = val.replace(/[^0-9]/g, '');
		 if (price < 0){
			return Promise.reject(util.format(notify.ERROR_COST_SHIP,0))
		 }
		 return
	}),
	body('ordering')
		.isInt({min: 0, max: 99})
		.withMessage(util.format(notify.ERROR_ORDERING,0,99)),
	body('status').not().isIn(['novalue']).withMessage(notify.ERROR_STATUS),
	async function (req, res) { // Finds the validation errors in this request and wraps them in an object with handy functions
			try {
			let item = req.body;
			let itemData = [{}]
			if(req.params.id != undefined){
				itemData = await serviceDelivery.getItemByID(req.params.id)
			}
			let errors = await validationResult(req)
			console.log(errors.errors)
			if(!errors.isEmpty()) {
				res.send({success:false})
				let main = {pageTitle: pageTitle,
							showError: errors.errors,
							}
				if (req.params.id !== undefined){
						res.render(`${folderView}form`, {
							pageTitle,
							main: main,
							item: itemData[0],
							id: req.params.id,
							layout,
						})
				} else {
					res.render(`${folderView}form`, {
						pageTitle,
						main: main,
						item: req.body,
						layout
					})
				}
				return
			}
				item.cost = item.cost.replace(/[^0-9]/g, '')
				if (req.params.id !== undefined) {
					let data = await serviceDelivery.editItem(req.params.id, item)
					req.flash('success', notify.EDIT_SUCCESS);
					res.redirect(linkIndex);
				} else {
					let data = await serviceDelivery.saveItems(item);
					req.flash('success', notify.ADD_SUCCESS);
					res.redirect(linkIndex);
					res.send({success:true})
				}
			} catch (error) {
				console.log(error)
			}
});



// Delete
router.post('/delete/(:status)?', async (req, res, next) => {
	try {
		if (req.params.status === 'multi') {
			let arrId = req.body.id.split(",")
			let data = await serviceDelivery.deleteItemsMulti(arrId);
			res.send({success: true})
	} else {
			let id = req.body.id
			let data = await serviceDelivery.deleteItem(id);
			res.send({success: true})
	}
	} catch (error) {
		console.log(error)
	}
});

router.post('/change-status/(:status)?', async (req, res, next) => {
		try {
			if (req.params.status === 'multi') {
        let arrId = req.body.id.split(",")
        let status = req.body.status
        let data = await serviceDelivery.changeStatusItemsMulti(arrId, status);
        res.send({success: true})
    } else {
        let {status, id} = req.body
        status = (status == 'active') ? 'inactive' : 'active'
        let changeStatus = await serviceDelivery.changeStatus(id, status)
        res.send({success: true})
    }
		} catch (error) {
			console.log(error)
		}
});

router.post('/change-ordering', 
	body('ordering')
		.isInt({min: 0, max: 99})
		.withMessage(util.format(notify.ERROR_ORDERING,0,99)), 
	async (req, res, next) => {
		try {
			const errors = validationResult(req);
			if (! errors.isEmpty()) {
				res.send({success: false, errors: errors})
				return
			}
			let {ordering, id} = req.body
			let changeStatus = await serviceDelivery.changeOrdering(id, ordering)
			res.send({success: true})
		} catch (error) {
			console.log(error)
		}
});

module.exports = router;