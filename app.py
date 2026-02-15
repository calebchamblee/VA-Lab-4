from flask import Flask, render_template, request
import pandas as pd

app = Flask(__name__)

# TODO: load the superstore data into a pandas DataFrame
orders = pd.read_excel('./Sample - Superstore.xls')
app.filtered_orders = orders
app.filters = {}
app.grouper = "Country/Region"
app.value = "Profit"
app.agg = "sum"

# TODO: define the groups, values, and aggregate functions that the user can select
groups = ['Country/Region', 'Region', 'State/Province']
values = ['Quantity', 'Sales', 'Profit']
aggs = ['sum', 'mean', 'variance', 'count']


# TODO: define a function for getting possible filter options for each grouper
def get_group_filters(df=None):
    if df is None:
        df = orders
    return {
        'Country/Region': df['Country/Region'].unique().tolist(),
        'Region': df['Region'].unique().tolist(),
        'State/Province': df['State/Province'].unique().tolist()
    }

#    group_filters = ...
#    return group_filters


# TODO: define a function that returns the aggregated data
def get_aggregated_data():
    x_col = app.grouper
    y_col = app.value
    res_df = app.filtered_orders.groupby(x_col)[y_col].agg(app.agg).reset_index()
    # {'x_col': [values_for_x], 'y_col': [values_for_y]}
    return res_df.to_dict('list')

#    aggregated_data = ...
#    return aggregated_data


# Pass the groups, values, aggregate functions, and group filters to the root.html template
@app.route("/")
def root():
    print('inside root')
    return render_template(
        "root.html",
        groups=groups,
        values=values,
        aggs=aggs,
        group_filters=get_group_filters(),
    )


# TODO: Complete the update_aggregate
# payload has format: {key: key, value: value}
@app.route("/update_aggregate", methods=["POST"])
def update_aggregate():
    payload = request.json
    if payload['key'] == 'agg':
        app.agg = payload['value']
    elif payload['key'] == 'grouper':
        app.grouper = payload['value']
    elif payload['key'] == 'value':
        app.value = payload['value']

    res_dict = get_aggregated_data()
    return {'data': res_dict[app.value], 'x_column': res_dict[app.grouper]}


# TODO: Complete the update_filter function
@app.route("/update_filter", methods=["POST"])
def update_filter():
    # update the global filter state (app.filters)
    print('inside update_filter')
    payload = request.json
    print(payload)
    filter_key = payload['key']
    filter_value = payload['value']
    print('key:', filter_key)
    print('value:', filter_value)
    if filter_value == 'All':
        if filter_key in app.filters:
            del app.filters[filter_key]
    else:
        app.filters[filter_key] = [filter_value]

    # update app.filtered_orders based on the latest filters
    filter_mask = pd.Series([True] * len(orders))
    # app.filter looks something like: { 'Country/Region': [All]... }
    for col, allowed_val in app.filters.items():
        mask = orders[col].isin(allowed_val)
        filter_mask = filter_mask & mask
    app.filtered_orders = orders[filter_mask]

    # ...
    new_filters = get_group_filters(app.filtered_orders)
    new_data = get_aggregated_data()
    return {
            'group_filters': new_filters, 
            'data': new_data, 
            'x_column': app.grouper, 
            'y_column': app.value 
           }


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000)
