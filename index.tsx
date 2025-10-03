
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

// FIX: Define types for form configuration to solve type inference issues.
type AnyField = { [key: string]: any, isCustom: boolean, component: string };
type FormSection = { id: string, title: string, fields: AnyField[] };

// Data structure for the form
const initialFormConfig: FormSection[] = [
    {
        id: 'general', title: 'Общая информация', fields: [
            { id: 'safetyContact', label: 'Контакт по безопасности', component: 'textarea', rows: 5, placeholder: 'Введите контакт по безопасности вручную или сгенерируйте...', required: true, isCustom: false },
            { id: 'prevShiftCompleted', label: 'Поручения: Выполнено', component: 'textarea', rows: 3, placeholder: 'Что было выполнено...', required: true, isCustom: false },
            { id: 'prevShiftNotCompleted', label: 'Поручения: Не выполнено', component: 'textarea', rows: 3, placeholder: 'Что не было выполнено...', required: true, isCustom: false },
        ]
    },
    {
        id: 'otpb', title: 'ОТПБ и персонал', fields: [
            { id: 'injuries', label: 'Травматизм и несчастные случаи', component: 'radio', options: [{ value: 'не зарегистрировано', label: 'Не зарегистрировано' }, { value: 'зарегистрировано', label: 'Зарегистрировано' }], isCustom: false },
            { id: 'accidents', label: 'Аварии', component: 'radio', options: [{ value: 'не зарегистрировано', label: 'Не зарегистрировано' }, { value: 'зарегистрировано', label: 'Зарегистрировано' }], isCustom: false },
            { id: 'workSafety', label: 'Отработали', component: 'radio', options: [{ value: 'безопасно', label: 'Безопасно' }, { value: 'не безопасно', label: 'Не безопасно' }], isCustom: false },
            { id: 'ltif', label: 'Ltif равен', component: 'radio', options: [{ value: 'нулю', label: 'Нулю' }, { value: 'не равен', label: 'Не равен' }], isCustom: false },
            { id: 'accidentIndex', label: 'Индекс аварийности', component: 'radio', options: [{ value: 'нулю', label: 'Нулю' }, { value: 'не равен', label: 'Не равен' }], isCustom: false },
            { id: 'shiftOn', label: 'Человек на смене', component: 'input', type: 'number', placeholder: '8', isCustom: false, grid: 'col-span-1' },
            { id: 'shiftTotal', label: 'Всего в смене', component: 'input', type: 'number', placeholder: '10', isCustom: false, grid: 'col-span-1' },
            { id: 'otherShift', label: 'В другой смене', component: 'input', type: 'number', placeholder: '1', isCustom: false, grid: 'col-span-1' },
            { id: 'vacation', label: 'В отпуске', component: 'input', type: 'number', placeholder: '1', isCustom: false, grid: 'col-span-1' },
            { id: 'fromOtherShift', label: 'Из другой смены', component: 'input', type: 'number', placeholder: '0', isCustom: false, grid: 'col-span-1' },
            { id: 'sickLeave', label: 'На больничном', component: 'input', type: 'number', placeholder: '0', isCustom: false, grid: 'col-span-1' },
            { id: 'competenceIndex', label: 'Индекс компетенции, %', component: 'input', type: 'text', placeholder: '95', isCustom: false },
            { id: 'competenceRisks', label: 'Риски по индексу компетентности', component: 'textarea', rows: 2, placeholder: 'Отсутствуют', isCustom: false },
        ]
    },
    {
        id: 'dynamics', title: 'Динамика НТР, НАК, АСУТП, ПАЗ', fields: [
             { id: 'ntrViolations', label: 'Нарушения НТР', component: 'input', type: 'text', placeholder: 'не зарегистрировано', isCustom: false, grid: 'col-span-1' },
             { id: 'nakViolations', label: 'Нарушения НАК', component: 'input', type: 'text', placeholder: 'не зарегистрировано', isCustom: false, grid: 'col-span-1' },
             { id: 'recurringEvents', label: 'Повторяющиеся события, отклонения', component: 'textarea', rows: 2, placeholder: 'не обнаружено', isCustom: false },
             { id: 'asutpAlarms', label: 'Срабатывания сигнализации АСУТП, шт.', component: 'input', type: 'number', placeholder: '5', isCustom: false },
             { id: 'asutpAutoModeDaily', label: 'Регуляторы АСУТП в авто (сутки)', component: 'input', type: 'text', placeholder: '98%', isCustom: false, grid: 'col-span-1' },
             { id: 'asutpAutoModeMonthly', label: 'Регуляторы АСУТП в авто (месяц)', component: 'input', type: 'text', placeholder: '96%', isCustom: false, grid: 'col-span-1' },
             { id: 'pazActivations', label: 'Срабатывания ПАЗ', component: 'radio', options: [{ value: 'не зарегистрировано', label: 'Не зарегистрировано' }, { value: 'зарегистрировано', label: 'Зарегистрировано' }], isCustom: false },
             { id: 'blockerOverrides', label: 'Отключение блокировок', component: 'textarea', rows: 2, placeholder: 'не производилось', isCustom: false },
        ]
    },
    {
        id: 'consumption', title: 'Расходные нормы, анализы, ЭКОНС', fields: [
            { id: 'consumptionDeviation', label: 'Отклонение от расходных норм', component: 'radio', options: [{ value: 'не зарегистрировано', label: 'Не зарегистрировано' }, { value: 'зарегистрировано', label: 'Зарегистрировано' }], isCustom: false },
            { id: 'aoT50actual', label: 'АО по Т50 (факт)', component: 'input', type: 'number', isCustom: false, grid: 'col-span-1' },
            { id: 'aoT50plan', label: 'АО по Т50 (план)', component: 'input', type: 'number', isCustom: false, grid: 'col-span-1' },
            { id: 'aoT50change', label: 'АО по Т50 (изменение)', component: 'input', type: 'text', placeholder: 'Убирали __ единицы', isCustom: false },
            { id: 'aoT100actual', label: 'АО по Т100 (факт)', component: 'input', type: 'number', isCustom: false, grid: 'col-span-1' },
            { id: 'aoT100plan', label: 'АО по Т100 (план)', component: 'input', type: 'number', isCustom: false, grid: 'col-span-1' },
            { id: 'aoT100change', label: 'АО по Т100 (изменение)', component: 'input', type: 'text', placeholder: 'Добавляли __ единицы', isCustom: false },
            { id: 'vdskConsumption', label: 'Расход ВДСК', component: 'radio', options: [{ value: 'в норме', label: 'В норме' }, { value: 'не в норме', label: 'Не в норме' }], isCustom: false },
            { component: 'divider', title: 'Анализы 1/2 тл', isCustom: false },
            { id: 'analysis12_kv', label: 'К.В.', component: 'input', type: 'number', isCustom: false },
            { id: 'analysis12_loss', label: 'Потери', component: 'input', type: 'number', isCustom: false },
            { id: 'analysis12_bulk_density', label: 'Насыпная плотность', component: 'input', type: 'number', isCustom: false },
            { id: 'analysis12_color', label: 'Цвет', component: 'input', type: 'text', required: true, isCustom: false },
            { id: 'analysis12_agglomeration', label: 'Агломерация', component: 'input', type: 'text', required: true, isCustom: false },
            { component: 'divider', title: 'Анализы 3 тл', isCustom: false },
            { id: 'analysis3_kv', label: 'К.В.', component: 'input', type: 'number', isCustom: false },
            { id: 'analysis3_loss', label: 'Потери', component: 'input', type: 'number', isCustom: false },
            { id: 'analysis3_bulk_density', label: 'Насыпная плотность', component: 'input', type: 'number', isCustom: false },
            { id: 'analysis3_color', label: 'Цвет', component: 'input', type: 'text', required: true, isCustom: false },
            { id: 'analysis3_agglomeration', label: 'Агломерация', component: 'input', type: 'text', required: true, isCustom: false },
            { id: 'unidentifiedImbalances', label: 'Неидентифицированные дебалансы', component: 'radio', options: [{ value: 'не обнаружено', label: 'Не обнаружено' }, { value: 'обнаружено', label: 'Обнаружено' }], isCustom: false },
            { id: 'greenZoneTime', label: 'Время в зеленой зоне, %', component: 'input', type: 'text', placeholder: '99', isCustom: false },
            { id: 'ekonsExceptions', label: 'Показатели ЭкОНС (исключения)', component: 'textarea', rows: 2, placeholder: 'Нет', isCustom: false },
            { id: 'suutpEfficiency', label: 'Эффективность СУУТП, %', component: 'input', type: 'text', placeholder: '100', isCustom: false },
            { id: 'dailyProduction12', label: 'Выработка 1/2 тл', component: 'input', type: 'number', isCustom: false, grid: 'col-span-1' },
            { id: 'dailyProduction3', label: 'Выработка 3 тл', component: 'input', type: 'number', isCustom: false, grid: 'col-span-1' },
        ]
    },
    {
        id: 'sbsProduction', title: 'Сводка по производству СБС', fields: [
            { component: 'sbsCard', title: 'Упаковано за сутки', fields: ['packedDailyPlan', 'packedDailyActual', 'packedDailyPercentage'], isCustom: false },
            { component: 'sbsCard', title: 'Паспортизовано за сутки', fields: ['certifiedDailyPlan', 'certifiedDailyActual', 'certifiedDailyPercentage'], isCustom: false },
            { component: 'sbsCard', title: 'Паспортизировано с начала месяца', fields: ['certifiedMonthlyPlanCumulative', 'certifiedMonthlyActualCumulative', 'certifiedMonthlyPlanTotal', 'certifiedMonthlyPercentage'], isCustom: false },
            { component: 'sbsCard', title: 'Упаковано с начала месяца', fields: ['packedMonthlyPlanCumulative', 'packedMonthlyActualCumulative', 'packedMonthlyPlanTotal', 'packedMonthlyPercentage'], isCustom: false },
        ]
    },
    {
        id: 'additionalInfo', title: 'Дополнительная информация', fields: [
            { id: 'labComments', label: 'Замечания от лаборатории', component: 'textarea', rows: 4, placeholder: 'не было', isCustom: false },
            { id: 'downtimeReasons', label: 'Причины простоев', component: 'textarea', rows: 4, placeholder: 'Простоев не было.', isCustom: false },
            { id: 'risks', label: 'Риски', component: 'textarea', rows: 4, placeholder: 'Риски отсутствуют.', isCustom: false },
            { id: 'shiftAssignments', label: 'Поручения на смену', component: 'textarea', rows: 4, placeholder: 'Введите поручения на смену...', isCustom: false },
        ]
    }
];

// Helper to create the initial form data state from the config
// FIX: Type the config parameter and the returned data object to ensure type safety.
const createInitialFormData = (config: FormSection[]) => {
    const data: Record<string, any> = {
        // Hardcoded default values
        injuries: 'не зарегистрировано', accidents: 'не зарегистрировано', workSafety: 'безопасно', ltif: 'нулю', accidentIndex: 'нулю',
        competenceRisks: 'Отсутствуют', ntrViolations: 'не зарегистрировано', nakViolations: 'не зарегистрировано', recurringEvents: 'не обнаружено',
        pazActivations: 'не зарегистрировано', blockerOverrides: 'не производилось', consumptionDeviation: 'не зарегистрировано',
        vdskConsumption: 'в норме', unidentifiedImbalances: 'не обнаружено', labComments: 'не было',
    };
    config.forEach(section => {
        section.fields.forEach(field => {
            if (field.id && data[field.id] === undefined) {
                data[field.id] = '';
            }
        });
    });
     // Special fields for SBS cards
    Object.assign(data, {
        packedDailyPlan: '', packedDailyActual: '', packedDailyPercentage: '', certifiedDailyPlan: '', certifiedDailyActual: '',
        certifiedDailyPercentage: '', certifiedMonthlyPlanCumulative: '', certifiedMonthlyActualCumulative: '',
        certifiedMonthlyPlanTotal: '', certifiedMonthlyPercentage: '', packedMonthlyPlanCumulative: '',
        packedMonthlyActualCumulative: '', packedMonthlyPlanTotal: '', packedMonthlyPercentage: ''
    });
    return data;
};

type ApiProvider = 'local' | 'gemini';

const API_CONFIG: Record<ApiProvider, { name: string; keyLink?: string; placeholder?: string; }> = {
    local: { name: 'Встроенный', },
    gemini: { name: 'Gemini', keyLink: 'https://aistudio.google.com/app/apikey', placeholder: 'Введите ваш Gemini API ключ...' }
};

const PREDEFINED_SAFETY_CONTACTS = [
    "При работе с ручным электроинструментом всегда проверяйте целостность кабеля и корпуса. Использование поврежденного инструмента может привести к поражению электрическим током. Перед каждым использованием проводите визуальный осмотр. Не используйте инструмент, если заметили трещины, сколы или оголенные провода. Немедленно сообщите о неисправности вашему руководителю.",
    "Передвигаясь по территории цеха, будьте внимательны и смотрите под ноги. На полу могут быть разливы масла, воды или другие скользкие вещества, которые могут привести к падению. Всегда используйте обозначенные пешеходные дорожки. Если вы заметили разлив, не проходите мимо – обозначьте опасное место и сообщите службе уборки. Ваша бдительность помогает предотвратить травмы.",
    "Во время подъема или спуска по лестнице всегда держитесь за перила. Не носите в руках предметы, которые мешают свободно держаться или закрывают обзор. Разговоры по мобильному телефону во время движения по лестнице строго запрещены. Один неверный шаг может привести к серьезному падению и травме. Сосредоточьтесь на движении для обеспечения своей безопасности.",
    "Никогда не снимайте защитные кожухи с работающего оборудования. Они установлены для предотвращения попадания в движущиеся части механизмов. Даже если кажется, что это ускорит работу, риск получения тяжелой травмы несоизмеримо выше. Доступ к механизмам разрешен только после полной остановки оборудования и его блокировки. Берегите свои руки и жизнь.",
    "Использование средств индивидуальной защиты (СИЗ) является обязательным на производственной площадке. Каска, защитные очки и специальная обувь защищают вас от множества рисков. Не пренебрегайте этими правилами, даже если выполняете 'быструю' задачу. Большинство несчастных случаев происходит именно из-за неоправданной спешки и игнорирования базовых требований безопасности. Ваше здоровье – ваша главная ценность.",
];

const ReportSection = ({ title, children, className = '' }: { title: string, children?: React.ReactNode, className?: string }) => (
    <section className={`report-section mb-6 break-inside-avoid ${className}`}>
        <h3 className="font-bold text-gray-800 border-b-2 border-gray-300 pb-2 mb-3" style={{ fontSize: '15px' }}>{title}</h3>
        <div className="space-y-2">{children}</div>
    </section>
);

const MetricItem: React.FC<{ label: string, value: string | number }> = ({ label, value }) => (
    <div className="flex justify-between items-baseline text-sm">
        <p className="text-gray-600 truncate pr-2">{label}:</p>
        <p className="text-gray-900 font-semibold text-right pl-2">{String(value) || '__'}</p>
    </div>
);

const SbsSummaryCard = ({ title, data }: { title: string, data: any[] }) => {
    const percentage = parseFloat(data.find(d => d.label === 'Выполнение')?.value) || 0;
    const isSuccess = percentage >= 100;
    const isWarning = percentage > 0 && percentage < 100;

    return (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 break-inside-avoid">
            <h4 className="font-semibold text-gray-800 mb-3" style={{ fontSize: '13px' }}>{title}</h4>
            <div className="space-y-2 text-sm">
                {data.map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                        <span className="text-gray-600">{item.label}:</span>
                        <span className={`font-bold ${item.label === 'Выполнение' ? (isSuccess ? 'text-green-600' : isWarning ? 'text-yellow-600' : 'text-gray-800') : 'text-gray-800'}`}>
                            {item.value}
                        </span>
                    </div>
                ))}
            </div>
            {data.some(d => d.label === 'Выполнение') && (
                 <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                            className={`h-2.5 rounded-full ${isSuccess ? 'bg-green-500' : isWarning ? 'bg-yellow-500' : 'bg-gray-400'}`} 
                            style={{ width: `${Math.min(percentage, 100)}%` }}>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ReportNoteItem = ({ label, value }: { label: string, value: string }) => (
    <div>
        <h4 className="font-semibold text-gray-800 mb-2" style={{ fontSize: '13px' }}>{label}</h4>
        <p className="text-gray-800 whitespace-pre-wrap leading-relaxed p-4 bg-gray-100 rounded-md border border-gray-200 text-sm">
            {value || '__'}
        </p>
    </div>
);

const ReportPreview = ({ formData, customFields }: { formData: any, customFields: any[] }) => {
    return (
        <div id="report-content" className="font-sans text-gray-900 bg-white p-6 rounded-lg" style={{ fontSize: '12px' }}>
            {/* === PAGE 1 === */}
            <div className="pdf-page">
                <header className="text-center mb-8">
                    <h2 className="font-extrabold text-black" style={{ fontSize: '24px' }}>Беседа по эффективности</h2>
                    <p className="text-gray-500 text-lg">Сменный отчет</p>
                    <p className="text-gray-500 text-md mt-1">{new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                </header>
                
                <p className="mb-6 text-gray-500 italic text-center">
                    Здравствуйте, коллеги. Начнем нашу беседу по эффективности с контакта по безопасности. У кого есть чем поделиться?
                </p>

                <ReportSection title="Контакт по безопасности и поручения">
                    <p className="text-gray-800 whitespace-pre-wrap leading-relaxed p-4 bg-gray-100 rounded-md border border-gray-200 text-sm">
                        {formData.safetyContact || '__'}
                    </p>
                    <div className="mt-4 columns-2 gap-x-6">
                        <div className="break-inside-avoid">
                            <h4 className="font-semibold text-gray-800 mb-2" style={{ fontSize: '13px' }}>Выполнено:</h4>
                            <p className="text-green-700 font-medium">{formData.prevShiftCompleted || '__'}</p>
                        </div>
                        <div className="break-inside-avoid">
                            <h4 className="font-semibold text-gray-800 mb-2" style={{ fontSize: '13px' }}>Не выполнено:</h4>
                            <p className="text-yellow-700 font-medium">{formData.prevShiftNotCompleted || '__'}</p>
                        </div>
                    </div>
                </ReportSection>

                <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                    <ReportSection title="ОТПБ">
                        <MetricItem label="Травматизм и несчастные случаи" value={formData.injuries} />
                        <MetricItem label="Аварии" value={formData.accidents} />
                        <MetricItem label="Отработали" value={formData.workSafety} />
                        <MetricItem label="LTIF" value={formData.ltif} />
                        <MetricItem label="Индекс аварийности" value={formData.accidentIndex} />
                    </ReportSection>

                    <ReportSection title="Персонал">
                        <MetricItem label="На смене / Всего" value={`${formData.shiftOn || '_'} / ${formData.shiftTotal || '_'}`} />
                        <MetricItem label="В другой смене" value={formData.otherShift} />
                        <MetricItem label="В отпуске" value={formData.vacation} />
                        <MetricItem label="Из другой смены" value={formData.fromOtherShift} />
                        <MetricItem label="На больничном" value={formData.sickLeave} />
                        <MetricItem label="Индекс компетенции" value={`${formData.competenceIndex || '_'}%`} />
                        <MetricItem label="Риски по компетенциям" value={formData.competenceRisks} />
                    </ReportSection>
                </div>
                
                <p className="my-6 text-gray-500 italic text-center">
                    Передаем слово старшему менеджеру.
                </p>
            </div>

            {/* === PAGE 2 === */}
            <div className="pdf-page print-page-break">
                <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                    <ReportSection title="Динамика НТР, НАК, АСУТП, ПАЗ">
                        <MetricItem label="Нарушения НТР (сутки)" value={formData.ntrViolations} />
                        <MetricItem label="Нарушения НАК (сутки)" value={formData.nakViolations} />
                        <MetricItem label="Повторяющиеся события" value={formData.recurringEvents} />
                        <MetricItem label="Срабатывания сигнализации АСУТП" value={`${formData.asutpAlarms} шт.`} />
                        <MetricItem label="Регуляторы АСУТП в авто (сутки / месяц)" value={`${formData.asutpAutoModeDaily} / ${formData.asutpAutoModeMonthly}`} />
                        <MetricItem label="Срабатывания ПАЗ" value={formData.pazActivations} />
                        <MetricItem label="Отключение блокировок" value={formData.blockerOverrides} />
                    </ReportSection>

                    <ReportSection title="Расходные нормы, анализы, ЭКОНС">
                        <MetricItem label="Отклонение от расходных норм" value={formData.consumptionDeviation} />
                        <div className="space-y-1">
                            <MetricItem label="АО по Т50 (факт / план)" value={`${formData.aoT50actual || '__'} / ${formData.aoT50plan || '__'}`} />
                            {formData.aoT50change && <p className="text-xs text-right text-gray-500 italic pr-1">{formData.aoT50change}</p>}
                        </div>
                        <div className="space-y-1">
                            <MetricItem label="АО по Т100 (факт / план)" value={`${formData.aoT100actual || '__'} / ${formData.aoT100plan || '__'}`} />
                            {formData.aoT100change && <p className="text-xs text-right text-gray-500 italic pr-1">{formData.aoT100change}</p>}
                        </div>
                        <MetricItem label="Расход ВДСК" value={formData.vdskConsumption} />
                        
                        <div className="columns-2 gap-x-6 mt-4 pt-4 border-t border-gray-200">
                             <div className="break-inside-avoid mb-4">
                                <h4 className="font-semibold text-gray-700 mb-2" style={{ fontSize: '13px' }}>Анализы 1/2 тл</h4>
                                <div className="space-y-1">
                                    <MetricItem label="К.В." value={formData.analysis12_kv} />
                                    <MetricItem label="Потери" value={formData.analysis12_loss} />
                                    <MetricItem label="Насыпная плотность" value={formData.analysis12_bulk_density} />
                                    <MetricItem label="Цвет" value={formData.analysis12_color} />
                                    <MetricItem label="Агломерация" value={formData.analysis12_agglomeration} />
                                </div>
                            </div>
                            <div className="break-inside-avoid">
                                <h4 className="font-semibold text-gray-700 mb-2" style={{ fontSize: '13px' }}>Анализы 3 тл</h4>
                                <div className="space-y-1">
                                    <MetricItem label="К.В." value={formData.analysis3_kv} />
                                    <MetricItem label="Потери" value={formData.analysis3_loss} />
                                    <MetricItem label="Насыпная плотность" value={formData.analysis3_bulk_density} />
                                    <MetricItem label="Цвет" value={formData.analysis3_color} />
                                    <MetricItem label="Агломерация" value={formData.analysis3_agglomeration} />
                                </div>
                            </div>
                        </div>
                        
                        <MetricItem label="Неидентифицированные дебалансы" value={formData.unidentifiedImbalances} />
                        <MetricItem label="Время в зеленой зоне" value={`${formData.greenZoneTime || '_'}%`} />
                        <MetricItem label="Эффективность СУУТП" value={`${formData.suutpEfficiency || '_'}%`} />
                        <MetricItem label="Выработка 1/2 тл" value={formData.dailyProduction12} />
                        <MetricItem label="Выработка 3 тл" value={formData.dailyProduction3} />
                    </ReportSection>
                </div>
            </div>
            
            {/* === PAGE 3 === */}
            <div className="pdf-page print-page-break">
                <p className="my-6 text-gray-500 italic text-center">
                    ВИП, ВИТ задают вопросы.
                </p>

                <ReportSection title="Динамика выполнения плана производства СБС">
                    <div className="grid md:grid-cols-2 gap-4">
                        <SbsSummaryCard title="Упаковано за сутки" data={[
                            { label: 'План, т', value: formData.packedDailyPlan },
                            { label: 'Факт, т', value: formData.packedDailyActual },
                            { label: 'Выполнение', value: `${formData.packedDailyPercentage}%` },
                        ]} />
                        <SbsSummaryCard title="Паспортизовано за сутки" data={[
                            { label: 'План, т', value: formData.certifiedDailyPlan },
                            { label: 'Факт, т', value: formData.certifiedDailyActual },
                            { label: 'Выполнение', value: `${formData.certifiedDailyPercentage}%` },
                        ]} />
                        <SbsSummaryCard title="Упаковано с начала месяца" data={[
                            { label: 'План нараст., т', value: formData.packedMonthlyPlanCumulative },
                            { label: 'Факт нараст., т', value: formData.packedMonthlyActualCumulative },
                            { label: 'План на месяц, т', value: formData.packedMonthlyPlanTotal },
                            { label: 'Выполнение', value: `${formData.packedMonthlyPercentage}%` },
                        ]} />
                        <SbsSummaryCard title="Паспортизировано с начала месяца" data={[
                            { label: 'План нараст., т', value: formData.certifiedMonthlyPlanCumulative },
                            { label: 'Факт нараст., т', value: formData.certifiedMonthlyActualCumulative },
                            { label: 'План на месяц, т', value: formData.certifiedMonthlyPlanTotal },
                            { label: 'Выполнение', value: `${formData.certifiedMonthlyPercentage}%` },
                        ]} />
                    </div>
                </ReportSection>
                
                <ReportSection title="Дополнительная информация">
                    <div className="space-y-4">
                        <ReportNoteItem label="Замечания от лаборатории" value={formData.labComments} />
                        <ReportNoteItem label="Причины простоев" value={formData.downtimeReasons} />
                        <ReportNoteItem label="Риски" value={formData.risks} />
                        <ReportNoteItem label="Поручения на смену" value={formData.shiftAssignments} />
                    </div>
                </ReportSection>

                {customFields.length > 0 && (
                    <ReportSection title="Дополнительные поля">
                        {customFields.map(field => (
                            <MetricItem key={field.id} label={field.label} value={formData[field.id]} />
                        ))}
                    </ReportSection>
                )}
                
                <div className="mt-8 pt-4 border-t border-gray-300 text-gray-500 space-y-2 italic text-center text-sm">
                    <p>Слово ИПРО о наличии сырья и ограничении.</p>
                    <p>ВИП ВИТ задают вопросы.</p>
                    <p>Слово сменным инженерам.</p>
                    <p>НС- Подводит итоги</p>
                </div>
            </div>
        </div>
    );
};

const AddFieldModal = ({ isOpen, onClose, onAddField, sectionId }: { isOpen: boolean, onClose: () => void, onAddField: (sectionId: string, fieldName: string) => void, sectionId: string | null }) => {
    const [fieldName, setFieldName] = useState('');

    if (!isOpen || !sectionId) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (fieldName.trim()) {
            onAddField(sectionId, fieldName.trim());
            setFieldName('');
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700 w-full max-w-md">
                <h2 className="text-2xl font-bold text-white mb-6">Добавить новое поле</h2>
                <form onSubmit={handleSubmit}>
                    <label htmlFor="fieldName" className="block mb-2 text-sm font-medium text-gray-300">Название поля</label>
                    <input
                        id="fieldName"
                        type="text"
                        value={fieldName}
                        onChange={(e) => setFieldName(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Например, 'Температура реактора'"
                        autoFocus
                    />
                    <div className="flex justify-end gap-4 mt-8">
                        <button type="button" onClick={onClose} className="py-2 px-4 text-gray-300 hover:text-white">Отмена</button>
                        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">Добавить</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ReportGenerator = () => {
    const [formConfig, setFormConfig] = useState(initialFormConfig);
    const [formData, setFormData] = useState(() => createInitialFormData(initialFormConfig));
    const [selectedApi, setSelectedApi] = useState<ApiProvider>('local');
    const [apiKeys, setApiKeys] = useState<Record<ApiProvider, string>>({ local: '', gemini: '' });
    const [copyButtonText, setCopyButtonText] = useState('Скопировать отчет');
    const [isGenerating, setIsGenerating] = useState(false);
    const [errors, setErrors] = useState<Partial<Record<keyof typeof formData, string>>>({});
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalSectionId, setModalSectionId] = useState<string | null>(null);

    // Load/Save form config and API keys from localStorage
    useEffect(() => {
        try {
            const savedConfig = localStorage.getItem('dynamicReportFormConfig');
            if (savedConfig) {
                const parsedConfig = JSON.parse(savedConfig);
                setFormConfig(parsedConfig);
                setFormData(createInitialFormData(parsedConfig));
            }

            const savedKeys = localStorage.getItem('apiKeys');
            if (savedKeys) {
                setApiKeys(JSON.parse(savedKeys));
            }
        } catch (error) {
            console.error("Failed to load data from localStorage:", error);
            // On error, reset to default
            localStorage.removeItem('dynamicReportFormConfig');
            localStorage.removeItem('apiKeys');
        }
    }, []);

    // Save config to localStorage whenever it changes
    useEffect(() => {
        try {
            localStorage.setItem('dynamicReportFormConfig', JSON.stringify(formConfig));
        } catch (error) {
            console.error("Failed to save form config to localStorage:", error);
        }
    }, [formConfig]);

    useEffect(() => {
        const calculatePercentage = (actualStr: string, planStr: string): string => {
            const actual = parseFloat(actualStr);
            const plan = parseFloat(planStr);
            if (isNaN(actual) || isNaN(plan) || plan === 0) return '';
            return Math.round((actual / plan) * 100).toString();
        };

        setFormData((prev: Record<string, any>) => ({
            ...prev,
            packedDailyPercentage: calculatePercentage(prev.packedDailyActual, prev.packedDailyPlan),
            certifiedDailyPercentage: calculatePercentage(prev.certifiedDailyActual, prev.certifiedDailyPlan),
            certifiedMonthlyPercentage: calculatePercentage(prev.certifiedMonthlyActualCumulative, prev.certifiedMonthlyPlanCumulative),
            packedMonthlyPercentage: calculatePercentage(prev.packedMonthlyActualCumulative, prev.packedMonthlyPlanCumulative),
        }));
    }, [
        formData.packedDailyActual, formData.packedDailyPlan,
        formData.certifiedDailyActual, formData.certifiedDailyPlan,
        formData.certifiedMonthlyActualCumulative, formData.certifiedMonthlyPlanCumulative,
        formData.packedMonthlyActualCumulative, formData.packedMonthlyPlanCumulative
    ]);


    const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        const newKeys = { ...apiKeys, [selectedApi]: value };
        setApiKeys(newKeys);
        try {
            localStorage.setItem('apiKeys', JSON.stringify(newKeys));
        } catch (error) {
            console.error("Failed to save API keys to localStorage:", error);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleGenerateClick = async () => {
        if (selectedApi === 'local') {
            setIsGenerating(true);
            setTimeout(() => {
                const randomIndex = Math.floor(Math.random() * PREDEFINED_SAFETY_CONTACTS.length);
                setFormData(prev => ({ ...prev, safetyContact: PREDEFINED_SAFETY_CONTACTS[randomIndex] }));
                setIsGenerating(false);
            }, 300);
            return;
        }

        const apiKey = apiKeys[selectedApi];
        if (!apiKey) {
            alert(`Пожалуйста, введите API ключ для ${API_CONFIG[selectedApi].name}.`);
            return;
        }
        
        setIsGenerating(true);
        try {
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: "Сгенерируй 'контакт по безопасности' для производственного предприятия. Текст должен состоять из 5 предложений. В тексте опиши потенциально опасную ситуацию и дай четкие инструкции, как ее избежать.",
            });
            setFormData(prev => ({ ...prev, safetyContact: response.text.trim() }));
        } catch (error) {
            console.error(`Error generating with ${selectedApi}:`, error);
            alert(`Не удалось сгенерировать контакт. Ошибка: ${(error as Error).message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAddField = (sectionId: string, fieldName: string) => {
        const newField = {
            id: `custom_${Date.now()}`,
            label: fieldName,
            component: 'input',
            type: 'text',
            isCustom: true,
        };

        setFormConfig(prevConfig => prevConfig.map(section => 
            section.id === sectionId
                ? { ...section, fields: [...section.fields, newField] }
                : section
        ));

        setFormData(prevData => ({ ...prevData, [newField.id]: '' }));
    };

    const handleDeleteField = (sectionId: string, fieldId: string) => {
        setFormConfig(prevConfig => prevConfig.map(section =>
            section.id === sectionId
                ? { ...section, fields: section.fields.filter(f => f.id !== fieldId) }
                : section
        ));

        setFormData(prevData => {
            const newData = { ...prevData };
            delete newData[fieldId as keyof typeof prevData];
            return newData;
        });
    };
    
    const handleMoveField = (sectionId: string, fieldIndex: number, direction: 'up' | 'down') => {
        setFormConfig(prevConfig => {
            return prevConfig.map(section => {
                if (section.id === sectionId) {
                    const newFields = [...section.fields];
                    const targetIndex = direction === 'up' ? fieldIndex - 1 : fieldIndex + 1;
    
                    if (targetIndex >= 0 && targetIndex < newFields.length) {
                        // Swap elements
                        [newFields[fieldIndex], newFields[targetIndex]] = [newFields[targetIndex], newFields[fieldIndex]];
                    }
                    
                    return { ...section, fields: newFields };
                }
                return section;
            });
        });
    };

    const openAddFieldModal = (sectionId: string) => {
        setModalSectionId(sectionId);
        setIsModalOpen(true);
    };

    const generatePlainTextReport = (data: typeof formData, customFields: any[]) => {
        const today = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const baseReport = `Беседа по эффективности.
Дата: ${today}
Здравствуйте, коллеги. Начнем нашу беседу по эффективности с контакта по безопасности. У кого есть чем поделиться?
Контакт по безопасности: ${data.safetyContact || '__'}
Поручения за предыдущую смену:
Выполнено: ${data.prevShiftCompleted || '__'}
Не выполнено: ${data.prevShiftNotCompleted || '__'}

За прошедшие сутки травматизма и несчастных случаев: ${data.injuries}.
аварий: ${data.accidents}.
отработали: ${data.workSafety}.
Ltif равен: ${data.ltif}.
индекс аварийности равен: ${data.accidentIndex}.
На смене ${data.shiftOn || '__'} из ${data.shiftTotal || '__'}.
${data.otherShift || '__'} человек в другой смене.
${data.vacation || '__'} в отпуске.
${data.fromOtherShift || '__'} из другой смены.
${data.sickLeave || '__'} больничный лист.
Индекс компетенции составляет ${data.competenceIndex || '__'}% с учетом вакансий.
Риски на проведение операций на основании индекса компетентности? ${data.competenceRisks || 'Отсутствуют'}.
Передаем слово старшему менеджеру.

Количество нарушений НТР за сутки: ${data.ntrViolations || '__'}
Нарушения НАК за сутки: ${data.nakViolations || '__'}
Повторящихся событий, критичных нарушений, наличие отклонений: ${data.recurringEvents || 'не обнаружено'}.
Количество срабатываний сигнализации АСУТП ${data.asutpAlarms || '__'} шт.
Работа регуляторов АСУТП в автоматическом режиме ${data.asutpAutoModeDaily || '__'} за сутки. ${data.asutpAutoModeMonthly || '__'} за месяц при норме до 95.
Срабатывания ПАЗ: ${data.pazActivations}.
Отключение блокировок: ${data.blockerOverrides || 'не производилось'}.
Часы максимум за сутки в норме.

ВИП, ВИТ задают вопросы.
Отклонение от расходных норм: ${data.consumptionDeviation}.
АО по Т50 получили ${data.aoT50actual || '__'} при задании ${data.aoT50plan || '__'}. ${data.aoT50change ? `(${data.aoT50change})` : ''}
АО по Т100 получили ${data.aoT100actual || '__'} при задании ${data.aoT100plan || '__'}. ${data.aoT100change ? `(${data.aoT100change})` : ''}
Расход ВДСК ${data.vdskConsumption}.
Анализы 1/2 тл: К.В.: ${data.analysis12_kv || '__'}; Потери: ${data.analysis12_loss || '__'}; Насыпная плотность: ${data.analysis12_bulk_density || '__'}; Цвет: ${data.analysis12_color || '__'}; Агломерация: ${data.analysis12_agglomeration || '__'}.
Анализы 3 тл: К.В.: ${data.analysis3_kv || '__'}; Потери: ${data.analysis3_loss || '__'}; Насыпная плотность: ${data.analysis3_bulk_density || '__'}; Цвет: ${data.analysis3_color || '__'}; Агломерация: ${data.analysis3_agglomeration || '__'}.
Наличие не идентифицированных дебалансов и потерь ${data.unidentifiedImbalances}.
Время нахождения в зеленой зоне ${data.greenZoneTime || '__'}%
Показатели ЭкОНС в зеленой зоне. Кроме: ${data.ekonsExceptions || '__'}
Полная эффективность СУУТП ${data.suutpEfficiency || '__'}%
Выработка 1/2 тл составила: ${data.dailyProduction12 || '__'}
Выработка 3 тл составила: ${data.dailyProduction3 || '__'}

Динамика выполнения плана производства СБС:
- Упаковано за сутки: План ${data.packedDailyPlan || '__'} т, Факт ${data.packedDailyActual || '__'} т. Выполнение плана: ${data.packedDailyPercentage || '__'}%.
- Паспортизовано за сутки: План ${data.certifiedDailyPlan || '__'} т, Факт ${data.certifiedDailyActual || '__'} т. Выполнение плана: ${data.certifiedDailyPercentage || '__'}%.
- Паспортизировано с начала месяца: План нараст. ${data.certifiedMonthlyPlanCumulative || '__'} т, Факт нараст. ${data.certifiedMonthlyActualCumulative || '__'} т. (План на месяц: ${data.certifiedMonthlyPlanTotal || '__'} т). Выполнение плана: ${data.certifiedMonthlyPercentage || '__'}%.
- Упаковано с начала месяца: План нараст. ${data.packedMonthlyPlanCumulative || '__'} т, Факт нараст. ${data.packedMonthlyActualCumulative || '__'} т. (План на месяц: ${data.packedMonthlyPlanTotal || '__'} т). Выполнение плана: ${data.packedMonthlyPercentage || '__'}%.

Замечаний от лаборатории по готовой: ${data.labComments || 'не было'}.
Были простои по причине: ${data.downtimeReasons || '__'}
Есть риски: ${data.risks || '__'}
Поручения на смену: ${data.shiftAssignments || '__'}
`;

        const customFieldsText = customFields.length > 0
            ? `\nДополнительные поля:\n${customFields.map(field => `${field.label}: ${data[field.id] || '__'}`).join('\n')}`
            : '';

        const footer = `
Слово ИПРО о наличии сырья и ограничении.
ВИП ВИТ задают вопросы.
Слово сменным инженерам.
НС- Подводит итоги`;
        
        return baseReport + customFieldsText + footer;
    };

    const copyToClipboard = () => {
        const reportText = generatePlainTextReport(formData, customFields);
        navigator.clipboard.writeText(reportText).then(() => {
            setCopyButtonText('Скопировано!');
            setTimeout(() => setCopyButtonText('Скопировать отчет'), 2000);
        });
    };
    
    const handleSaveAsTxt = () => {
        const reportText = generatePlainTextReport(formData, customFields);
        const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${new Date().toISOString().slice(0, 10)}_otchet.txt`;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    const handleSaveAsHtml = () => {
        const reportHtmlContent = document.getElementById('report-content')?.outerHTML || '';
        const fullHtml = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>Отчет</title><script src="https://cdn.tailwindcss.com"></script><style>body{font-family: Inter, sans-serif; background-color: #f3f4f6; display: flex; justify-content: center; padding: 2rem;} #report-content{max-width: 840px; box-shadow: 0 4px 6px -1px #0000001a;} .print-page-break{border-top:2px dashed #9ca3af;margin-top:2rem;padding-top:2rem;}</style></head><body>${reportHtmlContent}</body></html>`;
        const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${new Date().toISOString().slice(0, 10)}_otchet.html`;
        link.click();
        URL.revokeObjectURL(link.href);
    };
    
    const renderField = (field: any, index: number, totalFields: number) => {
        const name = field.id as keyof typeof formData;
        const hasError = !!errors[name];
        const isAdmin = true;

        const commonProps = {
            id: field.id, name: field.id,
            value: formData[name],
            onChange: field.component === 'radio' ? handleRadioChange : handleInputChange,
            className: `w-full bg-gray-700 border rounded-lg p-2.5 text-white focus:ring-blue-500 focus:border-blue-500 transition ${hasError ? 'border-red-500' : 'border-gray-600'}`,
            placeholder: field.placeholder || '',
        };

        const fieldWrapper = (content: React.ReactNode) => (
            <div className={`relative mb-4 ${field.grid || ''}`}>
                <label htmlFor={field.id} className="block mb-2 text-sm font-medium text-gray-300 pr-24">{field.label}</label>
                {content}
                {hasError && <p className="mt-1 text-sm text-red-400">{errors[name]}</p>}
                {isAdmin && (
                    <div className="absolute top-0 right-0 flex items-center">
                        <button type="button" onClick={() => handleMoveField(field.sectionId, index, 'up')} disabled={index === 0} className="p-1 text-gray-400 hover:text-white disabled:text-gray-700 disabled:cursor-not-allowed" title="Переместить вверх">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                        </button>
                        <button type="button" onClick={() => handleMoveField(field.sectionId, index, 'down')} disabled={index === totalFields - 1} className="p-1 text-gray-400 hover:text-white disabled:text-gray-700 disabled:cursor-not-allowed" title="Переместить вниз">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                        </button>
                        {field.isCustom && (
                            <button type="button" onClick={() => handleDeleteField(field.sectionId, field.id)} className="p-1 text-gray-400 hover:text-red-400" title="Удалить поле">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                            </button>
                        )}
                    </div>
                )}
            </div>
        );

        switch (field.component) {
            case 'input': return fieldWrapper(<input type={field.type || 'text'} {...commonProps} />);
            case 'textarea': return fieldWrapper(<textarea rows={field.rows || 3} {...commonProps} />);
            case 'radio': return (
                <div className="mb-4">
                    <label className="block mb-2 text-sm font-medium text-gray-300">{field.label}</label>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">{field.options.map((opt:any) => (
                        <label key={opt.value} className="flex items-center space-x-2 text-sm cursor-pointer">
                            <input type="radio" name={field.id} value={opt.value} checked={formData[name] === opt.value} onChange={handleRadioChange} className="form-radio h-4 w-4 text-blue-500 bg-gray-700 border-gray-600"/>
                            <span>{opt.label}</span>
                        </label>
                    ))}</div>
                </div>
            );
            case 'divider': return <h4 className="font-semibold text-gray-200 mb-3 mt-6 pt-4 border-t border-gray-700">{field.title}</h4>;
            case 'sbsCard': 
                 const labels: { [key: string]: string } = {
                    packedDailyPlan: 'План, т', packedDailyActual: 'Факт, т', packedDailyPercentage: 'Выполнение, %',
                    certifiedDailyPlan: 'План, т', certifiedDailyActual: 'Факт, т', certifiedDailyPercentage: 'Выполнение, %',
                    certifiedMonthlyPlanCumulative: 'План нараст.', certifiedMonthlyActualCumulative: 'Факт нараст.', certifiedMonthlyPlanTotal: 'План на месяц', certifiedMonthlyPercentage: 'Выполнение, %',
                    packedMonthlyPlanCumulative: 'План нараст.', packedMonthlyActualCumulative: 'Факт нараст.', packedMonthlyPlanTotal: 'План на месяц', packedMonthlyPercentage: 'Выполнение, %',
                };
                return (
                     <div className="p-4 border border-gray-700 rounded-lg mb-4">
                        <h4 className="font-semibold text-gray-200 mb-3">{field.title}</h4>
                        <div className={`grid grid-cols-1 sm:grid-cols-${field.fields.length} gap-4`}>
                            {field.fields.map((fieldId: string) => (
                                <div key={fieldId}>
                                    <label htmlFor={fieldId} className="block mb-2 text-sm font-medium text-gray-300">{labels[fieldId]}</label>
                                    <input
                                        type="number"
                                        id={fieldId} name={fieldId}
                                        value={formData[fieldId as keyof typeof formData]}
                                        onChange={handleInputChange}
                                        readOnly={fieldId.includes('Percentage')}
                                        className={`w-full bg-gray-700 border rounded-lg p-2.5 text-white ${fieldId.includes('Percentage') ? 'bg-gray-600 cursor-not-allowed' : 'focus:ring-blue-500 focus:border-blue-500'}`}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    const isApiKeyMissing = selectedApi !== 'local' && !apiKeys[selectedApi];
    const isAdmin = true;
    const customFields = formConfig.flatMap(section => section.fields).filter(field => field.isCustom);

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 lg:p-8">
            <AddFieldModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAddField={handleAddField} sectionId={modalSectionId} />
            <header className="text-center mb-10 no-print">
                <h1 className="text-4xl font-bold text-white">Генератор отчета</h1>
                <p className="text-lg text-gray-400 mt-2">"Беседа по эффективности"</p>
            </header>
            <main className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
                <div className="bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700 no-print">
                    <div className="mb-6 p-4 border border-blue-900/50 bg-blue-900/20 rounded-lg">
                        <label className="block mb-3 text-sm font-medium text-gray-200">Выберите источник генерации</label>
                        <div className="flex bg-gray-700 rounded-lg p-1">
                            {(Object.keys(API_CONFIG) as ApiProvider[]).map(api => (
                                <button key={api} onClick={() => setSelectedApi(api)} className={`w-full py-2 text-sm font-semibold rounded-md transition-colors ${selectedApi === api ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>
                                    {API_CONFIG[api].name}
                                </button>
                            ))}
                        </div>
                        {API_CONFIG[selectedApi].keyLink && (
                            <div className="mt-4">
                                <label htmlFor="apiKey" className="text-sm font-medium text-gray-300">{API_CONFIG[selectedApi].name} API Ключ</label>
                                <input id="apiKey" type="password" value={apiKeys[selectedApi]} onChange={handleApiKeyChange} placeholder={API_CONFIG[selectedApi].placeholder} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white mt-2"/>
                            </div>
                        )}
                    </div>

                    <form>
                        {formConfig.map(section => (
                            <fieldset key={section.id} className="mb-6">
                                <legend className="text-xl font-semibold text-white mb-4 border-b border-gray-600 pb-2 w-full">{section.title}</legend>
                                <div className={section.id === 'otpb' ? "grid grid-cols-2 gap-x-4" : ""}>
                                    {section.fields.map((field, index) => {
                                        const fieldProps = { ...field, sectionId: section.id };
                                        // Special handling for safetyContact button
                                        if (field.id === 'safetyContact') {
                                            return (
                                                <div className="relative" key={field.id}>
                                                    {renderField(fieldProps, index, section.fields.length)}
                                                    <button type="button" onClick={handleGenerateClick} disabled={isGenerating || isApiKeyMissing} className="absolute bottom-6 right-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white font-semibold py-1 px-3 rounded-lg text-sm flex items-center">
                                                        {isGenerating ? 'Генерация...' : '✨ Сгенерировать'}
                                                    </button>
                                                </div>
                                            );
                                        }
                                        return <React.Fragment key={field.id || `field-${index}`}>{renderField(fieldProps, index, section.fields.length)}</React.Fragment>;
                                    })}
                                </div>
                                {isAdmin && (
                                    <button type="button" onClick={() => openAddFieldModal(section.id)} className="mt-4 w-full text-center py-2 px-4 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:bg-gray-700 hover:border-gray-500 transition">
                                        + Добавить поле в "{section.title}"
                                    </button>
                                )}
                            </fieldset>
                        ))}
                    </form>
                </div>
                
                <div className="sticky top-8 h-fit print-container">
                     <div className="bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700">
                        <h2 className="text-xl font-semibold text-white mb-4 no-print">Предпросмотр отчета</h2>
                        <div className="h-[calc(100vh-220px)] overflow-y-auto preview-scroll">
                           <ReportPreview formData={formData} customFields={customFields} />
                        </div>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2 no-print">
                            <button onClick={copyToClipboard} className={`w-full font-bold py-2.5 px-4 rounded-lg transition-all text-sm ${copyButtonText === 'Скопировано!' ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}>{copyButtonText}</button>
                            <button onClick={handleSaveAsTxt} className="w-full font-bold py-2.5 px-4 rounded-lg transition-colors text-sm bg-gray-600 hover:bg-gray-700">Сохранить в .txt</button>
                            <button onClick={handleSaveAsHtml} className="w-full font-bold py-2.5 px-4 rounded-lg transition-colors text-sm bg-gray-600 hover:bg-gray-700">Сохранить в .html</button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

const App = () => {
    return <ReportGenerator />;
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
