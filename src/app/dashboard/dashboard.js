"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardComponent = void 0;
var core_1 = require("@angular/core");
var common_1 = require("@angular/common");
var stat_card_1 = require("../components/stat-card/stat-card");
var work_order_chart_1 = require("../components/work-order-chart/work-order-chart");
var cost_chart_1 = require("../components/cost-chart/cost-chart");
var work_order_table_1 = require("../components/work-order-table/work-order-table");
var DashboardComponent = function () {
    var _classDecorators = [(0, core_1.Component)({
            selector: 'app-dashboard',
            standalone: true,
            imports: [
                common_1.CommonModule,
                stat_card_1.StatCard,
                work_order_chart_1.WorkOrderChart,
                cost_chart_1.CostChart,
                work_order_table_1.WorkOrderTable
            ],
            templateUrl: './dashboard.html',
            styleUrls: ['./dashboard.css']
        })];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var DashboardComponent = _classThis = /** @class */ (function () {
        function DashboardComponent_1() {
            this.stats = [
                { title: 'Open Service Requests', value: 24, trend: '12% from last week', trendDirection: 'up' },
                { title: 'Active Work Orders', value: 24, trend: '5% from last week', trendDirection: 'down' },
                { title: 'Overdue Tasks', value: 24, trend: '22% from last week', trendDirection: 'up' },
                { title: 'Critical Assets Down', value: 3, trend: '50% from last week', trendDirection: 'down' }
            ];
        }
        return DashboardComponent_1;
    }());
    __setFunctionName(_classThis, "DashboardComponent");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        DashboardComponent = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return DashboardComponent = _classThis;
}();
exports.DashboardComponent = DashboardComponent;
