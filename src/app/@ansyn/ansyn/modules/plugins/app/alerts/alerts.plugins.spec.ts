import { AddAlertMsg, RemoveAlertMsg } from '../../../overlays/overlay-status/actions/overlay-status.actions';
import { AlertsPlugin } from './alerts.plugin';
import { Store, StoreModule } from '@ngrx/store';
import { inject, TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { provideMockActions } from '@ngrx/effects/testing';
import { AlertMsgTypesEnum } from '../../../alerts/model';

describe('AlertsPlugin', () => {
	let alertsPlugin: AlertsPlugin;
	let store: Store<any>;
	let actions: Observable<any>;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideMockActions(() => actions),
				AlertsPlugin
			],
			imports: [StoreModule.forRoot({})]
		});
	});

	beforeEach(inject([Store, AlertsPlugin], (_store: Store<any>, _alertsPlugin: AlertsPlugin) => {
		store = _store;
		alertsPlugin = _alertsPlugin;
		spyOnProperty(alertsPlugin, 'mapId').and.returnValue('mapId');

	}));

	it('should be defined', () => {
		expect(alertsPlugin).toBeDefined();
	});

	describe('setOverlaysNotInCase', () => {
		it('should add alert if not null and not include on filteredOverlays)', () => {
			const filtered: string[] = ['1', '2', '3'];
			alertsPlugin.notInQueryMsg = false;
			const overlay = <any>{ id: '4' };
			const result = alertsPlugin.setOverlaysNotInCase([overlay, filtered]);
			expect(result).toEqual(new AddAlertMsg({
				key: AlertMsgTypesEnum.overlayIsNotPartOfQuery,
				value: 'mapId'
			}));
		});

		describe('should remove alert if null or include on filteredOverlays', () => {
			it('not include', () => {
				const filtered: string[] = ['1', '2', '3'];
				const overlay = <any>{ id: '3' };
				alertsPlugin.notInQueryMsg = true;
				const result = alertsPlugin.setOverlaysNotInCase([overlay, filtered]);
				expect(result).toEqual(new RemoveAlertMsg({
					key: AlertMsgTypesEnum.overlayIsNotPartOfQuery,
					value: 'mapId'
				}));
			});

			it('undefined', () => {
				const filtered: string[] = ['1', '2', '3'];
				const overlay = undefined;
				alertsPlugin.notInQueryMsg = true;
				const result = alertsPlugin.setOverlaysNotInCase([overlay, filtered]);
				expect(result).toEqual(new RemoveAlertMsg({
					key: AlertMsgTypesEnum.overlayIsNotPartOfQuery,
					value: 'mapId'
				}));
			});

		});
	});

});
