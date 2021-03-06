import { Injectable } from '@angular/core';
import {
	CommunicatorEntity,
	geojsonMultiPolygonToPolygons,
	geojsonPolygonToMultiPolygon,
	ImageryCommunicatorService,
	ImageryMapPosition,
	IMapSettings,
	unifyPolygons
} from '@ansyn/imagery';
import {
	MapFacadeService,
	mapStateSelector,
	selectMaps, selectMapsList,
	SetToastMessageAction,
	UpdateMapAction
} from '@ansyn/map-facade';
import { AnnotationMode, DisabledOpenLayersMapName, OpenlayersMapName } from '@ansyn/ol';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { Dictionary } from '@ngrx/entity';
import { Store } from '@ngrx/store';
import { EMPTY, Observable } from 'rxjs';
import { fromPromise } from 'rxjs/internal-compatibility';
import { catchError, filter, map, mergeMap, switchMap, withLatestFrom } from 'rxjs/operators';
import {
	BackToWorldFailed,
	BackToWorldSuccess,
	BackToWorldView,
	OverlayStatusActionsTypes,
	SetOverlayScannedAreaDataAction,
	ToggleDraggedModeAction
} from '../actions/overlay-status.actions';
import { SetAnnotationMode } from '../../../menu-items/tools/actions/tools.actions';
import { DisplayOverlaySuccessAction, OverlaysActionTypes } from '../../actions/overlays.actions';
import { IOverlaysScannedAreaData, IOverlaysTranslationData } from '../../../menu-items/cases/models/case.model';
import { selectScannedAreaData, selectTranslationData } from '../reducers/overlay-status.reducer';
import { IOverlay } from '../../models/overlay.model';
import { feature } from '@turf/turf';
import { ImageryVideoMapType } from '@ansyn/imagery-video';

@Injectable()
export class OverlayStatusEffects {
	@Effect()
	backToWorldView$: Observable<any> = this.actions$
		.pipe(
			ofType(OverlayStatusActionsTypes.BACK_TO_WORLD_VIEW),
			withLatestFrom(this.store$.select(selectMaps)),
			filter(([action, entities]: [BackToWorldView, Dictionary<IMapSettings>]) => Boolean(entities[action.payload.mapId])),
			map(([action, entities]: [BackToWorldView, Dictionary<IMapSettings>]) => {
				const mapId = action.payload.mapId;
				const selectedMap = entities[mapId];
				const communicator = this.communicatorsService.provide(mapId);
				const { position } = selectedMap.data;
				return [action.payload, selectedMap, communicator, position];
			}),
			filter(([payload, selectedMap, communicator, position]: [{ mapId: string }, IMapSettings, CommunicatorEntity, ImageryMapPosition]) => Boolean(communicator)),
			switchMap(([payload, selectedMap, communicator, position]: [{ mapId: string }, IMapSettings, CommunicatorEntity, ImageryMapPosition]) => {
				const disabledMap = communicator.activeMapName === DisabledOpenLayersMapName || communicator.activeMapName === ImageryVideoMapType;
				this.store$.dispatch(new UpdateMapAction({
					id: communicator.id,
					changes: { data: { ...selectedMap.data, overlay: null, isAutoImageProcessingActive: false } }
				}));

				return fromPromise(disabledMap ? communicator.setActiveMap(OpenlayersMapName, position) : communicator.loadInitialMapSource(position))
					.pipe(
						map(() => new BackToWorldSuccess(payload)),
						catchError((err) => {
							this.store$.dispatch(new SetToastMessageAction({
								toastText: 'Failed to load map',
								showWarningIcon: true
							}));
							this.store$.dispatch(new BackToWorldFailed({ mapId: payload.mapId, error: err }));
							return EMPTY;
						})
					);
			})
		);

	@Effect()
	toggleTranslate$: Observable<any> = this.actions$.pipe(
		ofType(OverlayStatusActionsTypes.TOGGLE_DRAGGED_MODE),
		withLatestFrom(this.store$.select(selectMapsList)),
		mergeMap(([action, maps]: [ToggleDraggedModeAction, IMapSettings[]]) => {
			let annotationMode = null;

			const resultActions = [];
			if (action.payload.dragged) {
				annotationMode = AnnotationMode.Translate;
			}
			const filteredMaps = maps.filter((mapSettings) => mapSettings.id !== action.payload.mapId &&
				Boolean(mapSettings.data.overlay) && mapSettings.data.overlay.id === action.payload.overlayId);
			filteredMaps.forEach((mapSettings) => {
				resultActions.push(new SetAnnotationMode({
					annotationMode: annotationMode,
					mapId: mapSettings.id
				}));
			});
			resultActions.push(new SetAnnotationMode({ annotationMode: annotationMode, mapId: action.payload.mapId }));
			return resultActions;
		})
	);

	@Effect()
	onScannedAreaActivation$: Observable<any> = this.actions$.pipe(
		ofType(OverlayStatusActionsTypes.ACTIVATE_SCANNED_AREA),
		withLatestFrom(this.store$.select(mapStateSelector), this.store$.select(selectScannedAreaData)),
		map(([action, mapState, overlaysScannedAreaData]) => {
			const mapSettings: IMapSettings = MapFacadeService.activeMap(mapState);
			return [mapSettings.data.position, mapSettings.data.overlay, overlaysScannedAreaData];
		}),
		filter(([position, overlay, overlaysScannedAreaData]: [ImageryMapPosition, IOverlay, IOverlaysScannedAreaData]) => Boolean(position) && Boolean(overlay)),
		map(([position, overlay, overlaysScannedAreaData]: [ImageryMapPosition, IOverlay, IOverlaysScannedAreaData]) => {
			let scannedArea = overlaysScannedAreaData && overlaysScannedAreaData[overlay.id];
			if (!scannedArea) {
				scannedArea = geojsonPolygonToMultiPolygon(position.extentPolygon);
			} else {
				try {
					const polygons = geojsonMultiPolygonToPolygons(scannedArea);
					polygons.push(position.extentPolygon);
					const featurePolygons = polygons.map((polygon) => {
						return feature(polygon);
					});
					const combinedResult = unifyPolygons(featurePolygons);
					if (combinedResult.geometry.type === 'MultiPolygon') {
						scannedArea = combinedResult.geometry;
					} else {	// polygon
						scannedArea = geojsonPolygonToMultiPolygon(combinedResult.geometry);
					}
				} catch (e) {
					console.error('failed to save scanned area', e);
					return EMPTY;
				}
			}
			return new SetOverlayScannedAreaDataAction({ id: overlay.id, area: scannedArea });
		}));

	constructor(protected actions$: Actions,
				protected communicatorsService: ImageryCommunicatorService,
				protected store$: Store<any>) {
	}
}
