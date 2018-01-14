import { async, inject, TestBed } from '@angular/core/testing';
import { Store, StoreModule } from '@ngrx/store';
import {
	casesFeatureKey, CasesReducer, casesStateSelector, ICasesState,
	initialCasesState
} from '@ansyn/menu-items/cases/reducers/cases.reducer';
import { ImageryCommunicatorService } from '@ansyn/imagery/communicator-service/communicator.service';
import {
	IMapState, initialMapState, mapFeatureKey, MapReducer,
	mapStateSelector
} from '@ansyn/map-facade/reducers/map.reducer';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable } from 'rxjs/Observable';
import {
	ILayerState, initialLayersState,
	layersStateSelector
} from '@ansyn/menu-items/layers-manager/reducers/layers.reducer';
import { cloneDeep } from 'lodash';
import { coreInitialState, coreStateSelector } from '@ansyn/core/reducers/core.reducer';
import { VisualizersAnnotationsAppEffects } from './visualizers.annotations.app.effects';
import {
	AnnotationAgentOperation, AnnotationAgentRelevantMap, AnnotationVisualizerAgentAction,
	SetAnnotationMode
} from '@ansyn/menu-items/tools/actions/tools.actions';
import { cold, hot } from 'jasmine-marbles';
import { SetAnnotationsLayer } from '@ansyn/menu-items/layers-manager/actions/layers.actions';
import { ActiveMapChangedAction, AnnotationDrawEndAction } from '@ansyn/map-facade/actions/map.actions';
import { AnnotationMode } from '@ansyn/menu-items/tools/reducers/tools.reducer';
import { IVisualizerEntity } from '@ansyn/imagery/model/imap-visualizer';

describe('VisualizersAnnotationsAppEffects', () => {
	let visualizersAnnotationsAppEffects: VisualizersAnnotationsAppEffects;
	let store: Store<any>;
	let actions: Observable<any>;
	let imageryCommunicatorService: ImageryCommunicatorService = null;
	let coreState = coreInitialState;
	let caseState: ICasesState = cloneDeep(initialCasesState);
	let layersState: ILayerState = cloneDeep(initialLayersState);
	let mapState: IMapState = cloneDeep(initialMapState);

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			imports: [
				StoreModule.forRoot({
					[casesFeatureKey]: CasesReducer,
					[mapFeatureKey]: MapReducer
				})
			],
			providers: [
				VisualizersAnnotationsAppEffects,
				provideMockActions(() => actions),
				ImageryCommunicatorService
			]

		}).compileComponents();
	}));

	beforeEach(inject([Store], (_store: Store<any>) => {
		store = _store;
		const fakeStore = new Map<any, any>([
			[casesStateSelector, caseState],
			[layersStateSelector, layersState],
			[mapStateSelector, mapState],
			[coreStateSelector, coreState]
		]);
		mapState.activeMapId = 'activeMapId';
		mapState.mapsList = <any> [{ id: 'activeMapId' }, { id: 'map1' }, { id: 'map2' }];
		spyOn(store, 'select').and.callFake(type => Observable.of(fakeStore.get(type)));
	}));

	beforeEach(inject([VisualizersAnnotationsAppEffects, ImageryCommunicatorService], (_visualizersAnnotationsAppEffects: VisualizersAnnotationsAppEffects, _imageryCommunicatorService: ImageryCommunicatorService) => {
		visualizersAnnotationsAppEffects = _visualizersAnnotationsAppEffects;
		imageryCommunicatorService = _imageryCommunicatorService;
	}));

	describe('@Effect annotationVisualizerAgent$ ', () => {
		let fakeVisualizer;
		let fakeComm;

		beforeEach(() => {
			fakeComm = jasmine.createSpyObj([
				'getVisualizer'
			]);

			fakeVisualizer = jasmine.createSpyObj([
				'hide',
				'changeLine',
				'changeStroke',
				'changeFill',
				'removeDrawInteraction',
				'toggleDrawInteraction',
				'clearEntities',
				'setEntities'
			]);
			fakeComm.getVisualizer.and.returnValue(fakeVisualizer);
			spyOn(imageryCommunicatorService, 'provide').and.callFake(() => fakeComm);
		});

		const testActionOnMaps: { relevantMaps: AnnotationAgentRelevantMap, calledTimes: number }[] = [
			{ relevantMaps: 'all', calledTimes: 3 },
			{ relevantMaps: 'others', calledTimes: 2 },
			{ relevantMaps: 'active', calledTimes: 1 }
		];

		testActionOnMaps.forEach(item => {
			it(`check ${item.relevantMaps} maps are called`, () => {
				const action = new AnnotationVisualizerAgentAction({
					relevantMaps: item.relevantMaps,
					operation: 'changeLine',
					value: 'temp'
				});
				actions = hot('--a--', { a: action });
				const expectedResult = cold('--b--', { b: [action, layersState, mapState] });
				expect(visualizersAnnotationsAppEffects.annotationVisualizerAgent$).toBeObservable(expectedResult);
				expect(fakeVisualizer.changeLine).toHaveBeenCalledTimes(item.calledTimes);
			});
		});

		it('check show action', () => {
			const entities: IVisualizerEntity[] = [
				{
					id: 'id',
					featureJson: <any> 'featureJsonObject'
				}
			];
			layersState.annotationsLayer = <any> 'geoJsonObject';
			spyOn(visualizersAnnotationsAppEffects, 'annotationsLayerToEntities').and.returnValue(entities)
			const action = new AnnotationVisualizerAgentAction({
				relevantMaps: 'all',
				operation: 'show',
				value: 'temp'
			});
			actions = hot('--a--', { a: action });
			const expectedResult = cold('--b--', { b: [action, layersState, mapState] });
			expect(visualizersAnnotationsAppEffects.annotationVisualizerAgent$).toBeObservable(expectedResult);
			expect(fakeVisualizer.clearEntities).toHaveBeenCalled();
			expect(fakeVisualizer.setEntities).toHaveBeenCalledWith(entities);
		});

		const testCreateInteraction: { mode: AnnotationMode }[] = [
			{
				mode: 'Rectangle',
			},
			{
				mode: 'Arrow',
			},
			{
				mode: 'Circle',
			}
		];

		testCreateInteraction.forEach(({ mode }) => {
			it(`check ${mode} - toggle interaction`, () => {
				const action = new AnnotationVisualizerAgentAction({
					relevantMaps: 'all',
					operation: 'toggleDrawInteraction',
					mode: mode
				});
				actions = hot('--a--', { a: action });
				const expectedResult = cold('--b--', { b: [action, layersState, mapState] });
				expect(visualizersAnnotationsAppEffects.annotationVisualizerAgent$).toBeObservable(expectedResult);
				expect(fakeVisualizer.toggleDrawInteraction).toHaveBeenCalledWith(mode);
			});
		});

		const testChangesActions: { operation: AnnotationAgentOperation, func: string }[] = [
			{ operation: 'changeLine', func: 'changeLine' },
			{ operation: 'changeStrokeColor', func: 'changeStroke' },
			{ operation: 'changeFillColor', func: 'changeFill' }
		];

		testChangesActions.forEach(item => {
			const value = 'temp';
			it(`check ${item.operation} action`, () => {
				const action = new AnnotationVisualizerAgentAction({
					relevantMaps: 'all',
					operation: item.operation,
					value
				});
				actions = hot('--a--', { a: action });
				const expectedResult = cold('--b--', { b: [action, layersState, mapState] });
				expect(visualizersAnnotationsAppEffects.annotationVisualizerAgent$).toBeObservable(expectedResult);
				expect(fakeVisualizer[item.func]).toHaveBeenCalledWith(value);
			});
		});
		
		it('check remove layer', () => {
			const action = new AnnotationVisualizerAgentAction({
				relevantMaps: 'all',
				operation: 'hide'
			});
			actions = hot('--a--', { a: action });
			const expectedResult = cold('--b--', { b: [action, layersState, mapState] });
			expect(visualizersAnnotationsAppEffects.annotationVisualizerAgent$).toBeObservable(expectedResult);
			expect(fakeVisualizer.clearEntities).toHaveBeenCalled();
		});
	});

	it('drawAnnotationEnd$ should stringify the GeoJSON object and dispatch SetAnnotationsLayer', () => {
		const geoJson = <any> { 'geo': 'json' };
		layersState.annotationsLayer = {
			type: 'FeatureCollection',
			features: []
		};
		const expectedAnnotationLayer = {
			type: 'FeatureCollection',
			features: [geoJson ]
		}
		actions = hot('--a--', { a: new AnnotationDrawEndAction(geoJson) });
		const expectedResult = cold('--b--', { b: new SetAnnotationsLayer(<any>expectedAnnotationLayer) });
		expect(visualizersAnnotationsAppEffects.drawAnnotationEnd$).toBeObservable(expectedResult);
	});

	it('cancelAnnotationEditMode$ should cancel annotation edit mode ', () => {
		actions = hot('--a--', { a: new ActiveMapChangedAction('mapId') });
		const expectedResult = cold('--b--', {
			b: new SetAnnotationMode()
		});
		expect(visualizersAnnotationsAppEffects.cancelAnnotationEditMode$).toBeObservable(expectedResult);
	});

	describe('annotationData$ should get data from layers store and dispatch AnnotationVisualizerAgentAction with relevant maps', () => {

		it('true displayAnnotationsLayer should dispatch with "all"', () => {
			layersState.displayAnnotationsLayer = true;
			actions = hot('--a--', { a: new SetAnnotationsLayer(<any> 'geoJsonObject') });
			const expectedResult = cold('--b--', {
				b: new AnnotationVisualizerAgentAction({
					operation: 'show',
					relevantMaps: 'all'
				})
			});
			expect(visualizersAnnotationsAppEffects.annotationData$).toBeObservable(expectedResult);
		});

		it('false displayAnnotationsLayer should dispatch with "active"', () => {
			layersState.displayAnnotationsLayer = false;
			actions = hot('--a--', { a: new SetAnnotationsLayer(<any> 'geoJsonObject') });
			const expectedResult = cold('--b--', {
				b: new AnnotationVisualizerAgentAction({
					operation: 'show',
					relevantMaps: 'active'
				})
			});
			expect(visualizersAnnotationsAppEffects.annotationData$).toBeObservable(expectedResult);
		});
	});

	describe('class functions', () => {

		describe('relevantMapIds should filter maps via "releventMaps" value("all, "others", "active")', () => {
			const mapState = <IMapState> {
				activeMapId: 'activeMapId',
				mapsList: [{ id: 'activeMapId' }, { id: 'map1' }, { id: 'map2' }]
			};

			it('"all" should include all maps', () => {
				const result = visualizersAnnotationsAppEffects.relevantMapIds('all', mapState);
				expect(result).toEqual(['activeMapId', 'map1', 'map2']);
			});

			it('"others" should not include active map', () => {
				const result = visualizersAnnotationsAppEffects.relevantMapIds('others', mapState);
				expect(result).toEqual(['map1', 'map2']);
			});

			it('"active" should include only active map', () => {
				const result = visualizersAnnotationsAppEffects.relevantMapIds('active', mapState);
				expect(result).toEqual(['activeMapId']);
			});

		});

		it('annotationVisualizers should get ids array and return annotation visualizers array', () => {
			const annotationVisualizers: any[] = [
				{
					id: 'v1',
					getVisualizer: () => 'v1Visualizer'
				},
				{
					id: 'v2',
					getVisualizer: () => 'v2Visualizer'
				}
			];
			spyOn(imageryCommunicatorService, 'provide').and.callFake((_id) => annotationVisualizers.find(({ id }) => id === _id));
			const ids = ['v1', 'v2', 'v3'];
			const result: any[] = visualizersAnnotationsAppEffects.annotationVisualizers(ids);
			expect(result).toEqual(['v1Visualizer', 'v2Visualizer']);
		});
	});
});