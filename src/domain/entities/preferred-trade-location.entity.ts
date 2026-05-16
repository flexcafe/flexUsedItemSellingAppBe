export interface PreferredTradeLocationProps {
  id: string;
  label: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  sortOrder: number;
}

export class PreferredTradeLocationEntity {
  readonly id: string;
  readonly label: string;
  readonly address: string;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly sortOrder: number;

  constructor(props: PreferredTradeLocationProps) {
    this.id = props.id;
    this.label = props.label;
    this.address = props.address;
    this.latitude = props.latitude;
    this.longitude = props.longitude;
    this.sortOrder = props.sortOrder;
  }
}
