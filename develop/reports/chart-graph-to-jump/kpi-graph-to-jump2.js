﻿var type = ''; //存放周期类型
var temp_ids = ''; //存放所有选中id
var excel_ids = '';//存放所有的id 用于excel导出时进行数据查询
var data = null; //存放当前折线的所有数据
var EMID = ''; //'1d22868d659ed3bA27bc86aa'; //天然气ID

var options = (function () {
    var ret = {};

    // 是否在顶部选择项目
    ret.showCvs = true;

    // 是否允许多选
    ret.multiCvs = false;

    // 自动选择多少项
    ret.autoSelectNum = 1;

    // 默认时间类型（可选year、month、day）
    ret.defaultDateType = 'month';

    // 图表(可能有多个)
    ret.charts = [{
        // 容器的id
        containerId: 'chart1',
    }];

    return ret;
})();

var tree_about = {
    my_tree: null,

    current_tree_select_id: null,

    tree_config: {
        url: '/api/FactoryModelbase/GetTree',
        root_name: '能源工厂',
        id_field: 'ModelBaseId',
        name_field: 'ModelBaseName'
    },

    tree_init: function () {
        var that = this;

        // 初始化树(第一个参数是页面对象本身的指针，第二个参数是树配置)
        this.my_tree = new MyTree(this, this.tree_config);

        // 绑定树节点点击方法
        this.my_tree.bind_node_click_event_handler(this.tree_node_click);

        // 查询树
        this.my_tree.query(function (id) {
            //that.tree_node_click(id);
        });

        // 刷新按钮
        $('#refresh').click(function () {
            that.my_tree.reset(function (id) {
                that.tree_node_click(id);
            });
        });
    },

    tree_node_click: function (id) {
        this.current_tree_select_id = id;
        $('#ParentId').val(id);

        $('.cvs li').remove();

        cvs.selectedList = []; //清空历史已选项

        tp.bindDrawMethod(function () {
            draw();
        })

        cvs.allList = []; //清空历史cvs数据

        tp.bindCvsData(get_cvs_by_e());

        draw();
    }
}

//***************************
var my_grid_config = function () {
    return {
        store_config: {
            fields: [
                'Cycle',
                'MeasurePropertyID',
                'MeasurePropertyName',
                'ReportComputeValue',
                'ReportNaturallyDate',
                'UnitMeasureName'
            ]
        },

        grid_config: {
            autoScroll: true,
            columns: {
                defaults: {
                    flex: 1
                },
                items: [{
                    text: '名称',
                    dataIndex: 'MeasurePropertyName',
                    flex: 2
                }, {
                    text: '数值',
                    dataIndex: 'ReportComputeValue',
                    flex: 1
                }, {
                    text: '单位',
                    dataIndex: 'UnitMeasureName',
                    flex: 1
                }, {
                    text: '时间',
                    dataIndex: 'ReportNaturallyDate',
                    flex: 1
                }, {
                    text: '周期',
                    dataIndex: 'Cycle',
                    flex: 0.9
                }
                ]
            }
        },

        url: '/api/CommonSingleUnit/GetGridData',
        ps: 0, // 0表示不进行分页（前提是后台未关联分页参数）
        show_delete_column: false,
        grid_container_id: 'grid1'
    }
};

//查询表格
function queryGrid() {
    var cycle = null;
    if (type == 'month') {
        cycle = 'Day'
    }
    else if (type == 'year') {
        cycle = 'Month'
    }
    else if (type == 'day') {
        cycle = 'Hour'
    }
    else if (type == 'history') {
        cycle = 'Year'
    }
    var condition = { UnitId: temp_ids, Year: dst.getCurrYear() || 0, Month: dst.getCurrMonth() || 0, Day: dst.getCurrDay() || 0, Cycle: cycle };

    my_grid.query(condition);
}

$(function () {
    // 初始化MyGrid
    Ext.onReady(function () {
        //树相关
        tree_about.tree_init();

        tp.init();

        my_grid = new MyGrid(this, my_grid_config());
    });

    get_location_info();//根据location_info绘图

    //导出excel按钮
    $('#export').click(function () {
        if (!excel_ids) {
            Util.alert("没有数据可供导出");
            return false;
        }
        get_excel();
    });

    $('#show-grid').click(function () {
        if ($('#show-grid').html() == '显示表格') {
            $('#show-grid').html('隐藏表格');
            $('#for-grid').css('display', 'block');
            queryGrid();
        }
        else {
            $('#for-grid').css('display', 'none');
            $('#show-grid').html('显示表格');
        }
    });

    showBack();
})

function showBack() {
    var temp_location = window.location.search;
    var isBack = temp_location.split('isBack:')[1] ? temp_location.split('isBack:')[1].split(';')[0] : null;

    if (isBack == 'true') {
        $('#goback').show();
        $("#goback").click(function () {
            window.history.go(-1);
        })
    }
}

function draw() {
    if (tp.isReady() == false)
        return;

    type = dst.getCurrType();
    var year = dst.getCurrYear();
    var month = dst.getCurrMonth();
    var day = dst.getCurrDay();

    var cvsList = cvs.selectedList;

    //获取id数据
    temp_ids = '';
    var temp_cvs_length = cvsList.length;
    for (var i = 0; i < temp_cvs_length; i++) {
        temp_ids += ',' + cvsList[i].id;
    }
    temp_ids = temp_ids.substr(1);

    this.queryGrid();

    data = null;

    if (temp_ids && type == 'day') {
        data = get_line_data_by_hour(temp_ids, year, month, day);
    }
    else if (temp_ids && type == 'month') {
        data = get_line_data_by_day(temp_ids, year, month);
    }
    else if (temp_ids && type == 'year') {
        data = get_line_data_by_month(temp_ids, year);
    }
    else if (temp_ids && type == 'history') {
        data = get_line_data_by_year(temp_ids);
    }
    else {
        //console.log('error:get_line_data_by_xx()');
        return;
    }

    if (data) {
        data.leftYMin = 0;
        //console.log("data:");
        //console.log(data);
        linechart.draw(options.charts[0], data);
    }
}

//执行Excel获取操作
function get_excel() {
    var excel_data = get_excel_data();
    var filename = "导出Excel";
    if (!excel_data) {
        Util.alert("Excel数据查询为空");
        return false;
    }

    var form = $("<form>");
    form.attr("style", "display:none");
    form.attr("target", "_blank");
    form.attr("method", "post");
    form.attr("action", '/api/ExcelOut/GetExcel');
    $("body").append(form);

    var input1 = $("<input>");
    input1.attr("type", "hidden");
    input1.attr("name", "filename");
    input1.attr("value", filename);//命名Excel

    var input2 = $("<input>");
    input2.attr("type", "hidden");
    input2.attr("name", "datatype");
    input2.attr("value", "data");//传参类型

    var input3 = $("<input>");
    input3.attr("type", "hidden");
    input3.attr("name", "body");
    input3.attr("value", excel_data);//Excel数据

    form.append(input1);
    form.append(input2);
    form.append(input3);

    form.submit();
    form.remove();
}

//获取Excel数据
function get_excel_data() {
    //获取时间参数
    var type = dst.getCurrType() || 0;
    var year = dst.getCurrYear() || 0;
    var month = dst.getCurrMonth() || 0;
    var day = dst.getCurrDay() || 0;

    var excel_param = {
        UnitId: excel_ids,
        Year: year,
        Month: month,
        Day: day,
        Cycle: ''
    };

    if (type == 'day') {
        excel_param.Cycle = 'Hour';
    }
    else if (type == 'month') {
        excel_param.Cycle = 'Day';
    }
    else if (type == 'year') {
        excel_param.Cycle = 'Month';
    }
    else if (type == 'history') {
        excel_param.Cycle = 'Year';
    }
    else {
        //console.log('error:get_line_data_by_xx()');
        return;
    }

    var temp_excel_data = null;

    if (true) {
        $.ajax({
            url: '/api/CommonSingleUnit/GetExcelData',
            method: 'get',
            dataType: 'json',
            async: false,
            data: excel_param,
            success: function (data) {
                if (!data.Models || !data.Models.length) {
                    return;
                }
                else {
                    temp_excel_data = data.Models[0]; //如果查询成功 则进行暂存操作
                }
            }
        });
    }
    return temp_excel_data;
}

//根据获取单元数据
function get_cvs_by_e() {
    //var temp_location = window.name ? parent.document.getElementsByName(window.name)[0].src : window.location.search;//window.location.search.replace('?', ''); //获得window.location内容
    //var Config_ID = temp_location.split('ConfigID:')[1] ? temp_location.split('ConfigID:')[1].split(';')[0] : null; //获得ConfigID值
    var temp_models = null;

    if (1) {
        $.ajax({
            url: '/api/EngeryMeasureProperty/GetKPIUnit',
            method: 'get',
            dataType: 'json',
            async: false,
            data: { ModelBaseID: tree_about.current_tree_select_id, EnergyMediumId: EMID },
            success: function (data) {
                if (!data.Models || !data.Models.length) {
                    return;
                }
                else {
                    temp_models = data.Models; //如果查询成功 则进行暂存操作
                }
            }
        });
    }

    //按照demoHelper.cvs()组织数据格式
    if (temp_models) {
        var temp_cvs = [];
        excel_ids = '';
        var temp_models_length = temp_models.length;
        for (var i = 0; i < temp_models_length; i++) {
            var temp_obj = { itemId: '', itemName: '' };
            temp_obj.itemId = temp_models[i].MeasurePropertyID;
            temp_obj.itemName = temp_models[i].MeasurePropertyName;
            temp_cvs.push(temp_obj);
            excel_ids += ("'" + temp_models[i].MeasurePropertyID + "',");
        }
        excel_ids += ("''");
        return temp_cvs;
    }
    else {
        var temp_cvs = [{ itemId: '', itemName: '查询结果为空' }];
        excel_ids = '';
        return temp_cvs;
    }
}

//按年查询
function get_line_data_by_year(ids) {
    var temp_data = null;
    $.ajax({
        url: '/api/CommonSingleUnit/GetNewChartDataByYear',
        method: 'get',
        dataType: 'json',
        async: false,
        data: { UnitId: ids },
        success: function (data) {
            if (!data.Models || !data.Models.length) {
                return;
            }
            else {
                temp_data = data.Models[0]; //如果查询成功 则返回Models
            }
        }
    });
    return temp_data;
}

//按月查询
function get_line_data_by_month(ids, year) {
    var temp_data = null;
    $.ajax({
        url: '/api/CommonSingleUnit/GetNewChartDataByMonth',
        method: 'get',
        dataType: 'json',
        async: false,
        data: { UnitId: ids, Year: year },
        success: function (data) {
            if (!data.Models || !data.Models.length) {
                return;
            }
            else {
                temp_data = data.Models[0]; //如果查询成功 则返回Models
            }
        }
    });
    return temp_data;
}

//按日查询
function get_line_data_by_day(ids, year, month) {
    var temp_data = null;
    $.ajax({
        url: '/api/CommonSingleUnit/GetNewChartDataByDay',
        method: 'get',
        dataType: 'json',
        async: false,
        data: { UnitId: ids, Year: year, Month: month },
        success: function (data) {
            if (!data.Models || !data.Models.length) {
                return;
            }
            else {
                temp_data = data.Models[0]; //如果查询成功 则返回Models
            }
        }
    });
    return temp_data;
}

//按时查询
function get_line_data_by_hour(ids, year, month, day) {
    var temp_data = null;
    $.ajax({
        url: '/api/CommonSingleUnit/GetNewChartDataByHour',
        method: 'get',
        dataType: 'json',
        async: false,
        data: { UnitId: ids, Year: year, Month: month, Day: day },
        success: function (data) {
            if (!data.Models || !data.Models.length) {
                return;
            }
            else {
                temp_data = data.Models[0]; //如果查询成功 则返回Models
            }
        }
    });
    return temp_data;
}

//根据location_info绘图
function get_location_info() {
    //约定url传参格式为 [MeasurePropertyID:1d258556d15b429A27bc86aa,MeasurePropertyName:冶炼厂阳极铜电单耗]
    //获得window.location内容
    var temp_location = window.name ? parent.document.getElementsByName(window.name)[0].src : window.location.search;
    //获得值jumpMSG  [MeasurePropertyID:123456,MeasurePropertyName:654321] MeasurePropertyID:123456,MeasurePropertyName:654321
    var jumpMSG = temp_location.split('[')[1].split(']')[0];
    //获得值jumpMeasurePropertyID  MeasurePropertyID:123456,MeasurePropertyName:654321 MeasurePropertyID:123456 123456
    var jumpMeasurePropertyID = jumpMSG.split(',')[0].split('MeasurePropertyID:')[1];
    //获得值jumpMeasurePropertyName  MeasurePropertyID:123456,MeasurePropertyName:654321 MeasurePropertyName:654321 654321
    var jumpMeasurePropertyName = jumpMSG.split(',')[1].split('MeasurePropertyName:')[1];

    //构建数据 进行绘图

    var temp_cvs = [];
    var temp_obj = { itemId: '', itemName: '' };
    temp_obj.itemId = jumpMeasurePropertyID;
    temp_obj.itemName = jumpMeasurePropertyName;
    temp_cvs.push(temp_obj);

    $('.cvs li').remove();
    cvs.selectedList = []; //清空历史已选项
    cvs.allList = []; //清空历史cvs数据
    tp.bindCvsData(temp_cvs);
    draw();
}