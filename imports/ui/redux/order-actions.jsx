import { trackCollection } from 'meteor/skinnygeek1010:flux-helpers';
import Alert from 'react-s-alert';

import { validateItemAndAddValidationResults, validateItemAgainstSchema } from '../../../lib/validation-helpers';
import { recalculateOrderTotals } from '../../../lib/order-logic';

import Orders from '../../api/orders/order';
import { upsert, remove } from '../../api/orders/methods';
import store from './store.jsx';


// Add a listener that will trigger a render when the collection changes
Meteor.startup(function () { // work around files not being defined yet
    //console.log("Orders collection, add Redux tracking");

    if (Meteor.isClient) { // work around not having actions in /both folder
        // trigger action when this changes
        trackCollection(Orders, (data) => {
            store.dispatch(ordersCollectionChanged(data));
        });
    }
});


// used when a mongo orders collection changes
function ordersCollectionChanged(newDocs) {
    //console.log("OrderActions.ordersCollectionChanged ", newDocs);

    return (dispatch, getState) => {
        //console.log("inner OrderActions.ordersCollectionChanged ");

        return {
            type: 'ORDERS_COLLECTION_CHANGED',
            collection: newDocs
        };
    }
}


// doesn't return payload because our collection watcher
// will send a CHANGED action and update the store
export function saveOrder(order) {
    //console.log("saveOrder: ", order);

    return (dispatch, getState) => {

        // call the method for upserting the data
        upsert.call({
            orderId: order._id,
            data: order
        }, (err, res) => {
            //console.log ("Orders.methods.updateManualForm.call was called");
            if (err) {
                // TODO call FAILED action on error
                Alert.error(err.message);
            } else {
                Alert.success("Save successful");
                FlowRouter.go("/");
                dispatch ({
                    type: 'SAVE_ORDER'
                });
            }
        });
    }
}

export const EDIT_ORDER = 'EDIT_ORDER';
function sendOrderChanges(order) {
    return {
        type: EDIT_ORDER,
        order
    }
}

export function editOrder(order, newValues) {
    //console.log("OrderActions.editOrder() event.target:" + newValues);

    return (dispatch, getState) => {

        // don't mutate it
        const order = _.clone(getState().orderBeingEdited.order);

        // loop each change and apply to our clone
        for (let newValue of newValues) {
            order[newValue.name] = newValue.value;
        }

        // validate and set error messages
        validateItemAndAddValidationResults(order, Schemas.OrderSchema);

        //console.log("inner OrderActions.editOrder() " );
        dispatch (sendOrderChanges(order));
    }
}


export function editOrderLine(orderLineId, field, value) {
    //console.log("OrderActions.editOrder() event.value:" + value);

    return (dispatch, getState) => {

        // get the order and line - don't mutate
        const order = _.clone(getState().orderBeingEdited.order);
        const line = order.orderLines.find(x => x._id === orderLineId);

        line[field] = value;

        // validate and set error messages
        recalculateOrderTotals(order);

        validateItemAndAddValidationResults(line, Schemas.OrderLineSchema);

        //console.log("inner OrderActions.editOrderLine()", order);
        dispatch (sendOrderChanges(order));
    }
}


export function editOrderLineProduct(orderLineId, newValue) {
    //console.log("OrderActions.editOrderLineProduct() newValue:" + newValue);

    return (dispatch, getState) => {

        // get the order and line - don't mutate
        const order = _.clone(getState().orderBeingEdited.order);
        const line = order.orderLines.find(x => x._id === orderLineId);

        line.productId = newValue.selectedOption._id;
        line.description = newValue.selectedOption.name;
        line.unitPrice = newValue.selectedOption.price;

        // validate and set error messages
        recalculateOrderTotals(order);

        validateItemAndAddValidationResults(line, Schemas.OrderLineSchema);

        //console.log("inner OrderActions.editOrderLineProduct()", order);
        dispatch (sendOrderChanges(order));
    }
}


export function addNewOrderLine(event) {
    return (dispatch, getState) => {
        //console.log("addNewOrderLine");

        event.preventDefault();

        // get the order and line - don't mutate
        const order = _.clone(getState().orderBeingEdited.order);

        order.orderLines.push(getEmptyOrderLine());

        dispatch (sendOrderChanges(order));
    }
}


export function deleteOrderLine(id) {
    return (dispatch, getState) => {
        //console.log("inner deleteOrderLine");

        event.preventDefault();

        // get the order and line - don't mutate
        const order = _.clone(getState().orderBeingEdited.order);

        const line = order.orderLines.find(x => x._id === id);
        const pos = order.orderLines.indexOf(line);

        order.orderLines.splice(pos, 1);

        // update the calculated totals
        recalculateOrderTotals(order);

        dispatch (sendOrderChanges(order));
    }
}
function getEmptyOrderLine() {
    return {
        _id: Meteor.uuid(),
        productId: null,
        description: null,
        quantity: 0,
        unitPrice: 0,
        lineValue: 0,
        createdAt: new Date(),
        errors: {}
    };
}

export function selectOrder(orderId) {
    //console.log("OrderActions.selectOrder: " + orderId.toString());
    return (dispatch, getState) => {
        //console.log("INNER Actions.selectOrder: " + orderId.toString());

        const order = Orders.findOne({_id: orderId});

        // perform initial validation and set error messages
        validateItemAndAddValidationResults(order, Schemas.OrderSchema);

        order.orderLines.forEach(line => {
            validateItemAndAddValidationResults(line, Schemas.OrderLineSchema);
        });

        dispatch ({
            type: 'SELECT_ORDER',
            order
        });
    }
}

export function selectNewOrder() {
    //console.log("OrderActions.selectNewOrder ")

    return (dispatch, getState) => {

        const order = {
            orderLines: [],
            createdAt: new Date(),
            errors: {}
        };

        dispatch ({
            type: 'SELECT_ORDER',
            order
        });
    }
}
