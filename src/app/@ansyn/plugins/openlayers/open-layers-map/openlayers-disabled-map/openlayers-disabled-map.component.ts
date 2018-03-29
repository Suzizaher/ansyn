import { Component, ElementRef, EventEmitter, Inject, OnDestroy, ViewChild } from '@angular/core';
import { DisabledOpenLayersMapName, OpenLayersDisabledMap } from './openlayers-disabled-map';
import { BaseImageryPlugin, IMap, IMapComponent } from '@ansyn/imagery';
import { CaseMapPosition } from '@ansyn/core/models/case-map-position.model';
import {
	BaseImageryPluginProvider, MAP_NAME,
	ProvideMapName
} from '@ansyn/imagery/imagery/providers/imagery.providers';

@Component({
	selector: 'ansyn-disabled-ol-component',
	template: `
		<div #olMap></div>
	`,
	styles: [
			`div {
			position: absolute;
			width: 100%;
			height: 100%;
			left: 0;
			top: 0;
			display: block;
			box-sizing: border-box;

		}`],
	providers: [
		ProvideMapName(DisabledOpenLayersMapName),
		BaseImageryPluginProvider
	]
})

export class OpenLayersDisabledMapComponent implements OnDestroy, IMapComponent {
	static mapClass = OpenLayersDisabledMap;

	@ViewChild('olMap') mapElement: ElementRef;

	private _map: OpenLayersDisabledMap;
	public mapCreated: EventEmitter<IMap> = new EventEmitter<IMap>();

	constructor(@Inject(BaseImageryPlugin) public plugins: BaseImageryPlugin[],
				@Inject(MAP_NAME) public mapName: string) {
	}

	createMap(layers: any, position?: CaseMapPosition): void {
		this._map = new OpenLayersDisabledMap(this.mapElement.nativeElement, layers, position);
		this.mapCreated.emit(this._map);
	}

	ngOnDestroy(): void {
		if (this._map) {
			this._map.dispose();
		}
	}
}