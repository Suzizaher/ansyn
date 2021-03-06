import { async, inject, TestBed } from '@angular/core/testing';
import { Store, StoreModule } from '@ngrx/store';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable } from 'rxjs';

import { cold, hot } from 'jasmine-marbles';
import { HttpClientModule } from '@angular/common/http';
import {
	SetFavoriteOverlaysAction,
	SetOverlaysScannedAreaDataAction,
	SetOverlaysTranslationDataAction,
	SetPresetOverlaysAction,
	SetRemovedOverlaysIdsAction,
	SetRemovedOverlaysVisibilityAction
} from '../../../modules/overlays/overlay-status/actions/overlay-status.actions';
import { SetImageOpeningOrientation } from '../../../modules/status-bar/actions/status-bar.actions';
import { SelectCaseAppEffects } from './select-case.app.effects';
import { SetActiveMapId, SetLayoutAction, SetMapsDataActionStore } from '@ansyn/map-facade';
import {
	BeginLayerCollectionLoadAction,
	UpdateSelectedLayersIds
} from '../../../modules/menu-items/layers-manager/actions/layers.actions';
import { casesConfig, CasesService } from '../../../modules/menu-items/cases/services/cases.service';
import {
	SelectCaseAction,
	SelectCaseSuccessAction,
	SetAutoSave
} from '../../../modules/menu-items/cases/actions/cases.actions';
import { UpdateFacetsAction } from '../../../modules/menu-items/filters/actions/filters.actions';
import {
	SetAnnotationMode,
	SetMeasureDistanceToolState,
	UpdateOverlaysManualProcessArgs
} from '../../../modules/menu-items/tools/actions/tools.actions';
import { CoreConfig } from '../../../modules/core/models/core.config';
import { SetMiscOverlays, SetOverlaysCriteriaAction } from '../../../modules/overlays/actions/overlays.actions';
import {
	CaseOrientation,
	CaseRegionState,
	CaseTimeFilter,
	ICase,
	ICaseDataInputFiltersState,
	ICaseFacetsState,
	ICaseLayersState,
	ICaseMapsState,
	ICaseState,
	ICaseTimeState,
	IContextEntity,
	IOverlaysManualProcessArgs
} from '../../../modules/menu-items/cases/models/case.model';
import { IOverlay, IOverlaysHash } from '../../../modules/overlays/models/overlay.model';

describe('SelectCaseAppEffects', () => {
	let selectCaseAppEffects: SelectCaseAppEffects;
	let actions: Observable<any>;
	let store: Store<any>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			imports: [
				StoreModule.forRoot({}),
				HttpClientModule
			],
			providers: [
				SelectCaseAppEffects,
				provideMockActions(() => actions),
				{ provide: CoreConfig, useValue: {} },
				{ provide: casesConfig, useValue: {defaultCase: {id: 'caseId'}} },
				{ provide: CasesService, useValue: {} }
			]
		}).compileComponents();
	}));

	beforeEach(inject([Store], (_store: Store<any>) => {
		store = _store;
	}));

	beforeEach(inject([SelectCaseAppEffects], (_selectCaseAppEffects: SelectCaseAppEffects) => {
		selectCaseAppEffects = _selectCaseAppEffects;
	}));

	it('should be defined', () => {
		expect(selectCaseAppEffects).toBeDefined();
	});

	describe('selectCase$', () => {
		it('should set all feature stores properties', () => {
			const
				orientation: CaseOrientation = 'Imagery Perspective',
				timeFilter: CaseTimeFilter = 'Start - End',
				time: ICaseTimeState = { type: 'absolute', from: new Date(0), to: new Date(0) },
				region: CaseRegionState = {},
				dataInputFilters: ICaseDataInputFiltersState = { fullyChecked: true, filters: [], active: true },
				favoriteOverlays: IOverlay[] = [],
				removedOverlaysIds: string[] = [],
				removedOverlaysVisibility = true,
				presetOverlays: IOverlay[] = [],
				maps: ICaseMapsState = { activeMapId: 'activeMapId', data: [], layout: 'layout6' },
				layers: ICaseLayersState = {
					activeLayersIds: []
				},
				overlaysManualProcessArgs: IOverlaysManualProcessArgs = {},
				facets: ICaseFacetsState = { showOnlyFavorites: true, filters: [] },
				contextEntities: IContextEntity[] = [{ id: '234', date: new Date(), featureJson: null }],
				miscOverlays: IOverlaysHash = {},
				overlaysTranslationData = {},
				overlaysScannedAreaData = {}
			;

			let noInitialSearch;

			const state: ICaseState = <any>{
				orientation,
				timeFilter,
				time,
				region,
				dataInputFilters,
				favoriteOverlays,
				removedOverlaysVisibility,
				removedOverlaysIds,
				presetOverlays,
				overlaysTranslationData,
				maps,
				layers,
				overlaysManualProcessArgs,
				facets,
				contextEntities,
				miscOverlays,
				overlaysScannedAreaData
			};

			const payload: ICase = {
				id: 'caseId',
				name: 'caseName',
				owner: 'ownerName',
				lastModified: new Date(),
				creationTime: new Date(),
				autoSave: false,
				state
			};

			actions = hot('--a--', { a: new SelectCaseAction(payload) });

			const expectedResult = cold('--(abcdefghijklmnopqrstx)--', {
				a: new SetMapsDataActionStore({ mapsList: maps.data }),
				b: new SetActiveMapId(maps.activeMapId),
				c: new SetLayoutAction(<any>maps.layout),
				d: new SetImageOpeningOrientation({ orientation }),
				e: new SetOverlaysCriteriaAction({ time, region, dataInputFilters }, { noInitialSearch }),
				f: new SetFavoriteOverlaysAction(favoriteOverlays),
				g: new SetPresetOverlaysAction(presetOverlays),
				h: new SetMiscOverlays({ miscOverlays }),
				i: new SetOverlaysTranslationDataAction(overlaysTranslationData),
				j: new SetOverlaysScannedAreaDataAction(overlaysScannedAreaData),
				k: new BeginLayerCollectionLoadAction({ caseId: payload.id }),
				l: new UpdateOverlaysManualProcessArgs({ override: true, data: overlaysManualProcessArgs }),
				m: new UpdateFacetsAction(facets),
				n: new UpdateSelectedLayersIds([]),
				o: <any>{ type: '[Context] Set context params', payload: { contextEntities } },
				p: new SetAutoSave(false),
				q: new SetRemovedOverlaysIdsAction(removedOverlaysIds),
				r: new SetRemovedOverlaysVisibilityAction(removedOverlaysVisibility),
				s: new SetAnnotationMode(null),
				t: new SetMeasureDistanceToolState(false),
				x: new SelectCaseSuccessAction(payload)
			});

			expect(selectCaseAppEffects.selectCase$).toBeObservable(expectedResult);
		});
	});
});
