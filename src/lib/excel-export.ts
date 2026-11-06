/**
 * NOIR Atelier - Multi-Sheet Excel Spreadsheet Generator
 * Generates native Microsoft Office XML Spreadsheets (.xls) with multi-tab support
 * Compatible with Microsoft Excel, Apple Numbers, Google Sheets, and LibreOffice.
 */

export interface ExportOrderItem {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
  total_amount: number;
  payment_method: string;
  payment_status: string;
  tracking_number?: string;
  courier_name?: string;
  shipping_address?: {
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
  created_at: string;
  items?: {
    product_name: string;
    size?: string;
    color_name?: string;
    quantity: number;
    unit_price: number;
  }[];
}

function escapeXml(unsafe: string | number | undefined | null): string {
  if (unsafe === undefined || unsafe === null) return "";
  const str = String(unsafe);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function generateWorksheetXml(sheetName: string, orders: ExportOrderItem[]): string {
  const headers = [
    "Order ID",
    "Order Date",
    "Status",
    "Customer Name",
    "Email",
    "Phone",
    "Shipping Address",
    "City",
    "PIN Code",
    "Items Breakdown",
    "Total Quantity",
    "Payment Method",
    "Total Amount (INR)",
    "Courier Partner",
    "Tracking Number",
  ];

  let rowsXml = `
    <Row ss:StyleID="HeaderStyle">
      ${headers.map((h) => `<Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join("")}
    </Row>
  `;

  if (orders.length === 0) {
    rowsXml += `
      <Row>
        <Cell><Data ss:Type="String">No orders found for this category</Data></Cell>
      </Row>
    `;
  } else {
    orders.forEach((ord) => {
      const formattedDate = new Date(ord.created_at).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const itemsSummary = (ord.items || [])
        .map(
          (item) =>
            `${item.product_name} (${item.color_name || "Standard"}, Size ${item.size || "M"}) x ${item.quantity} [₹${item.unit_price.toLocaleString("en-IN")}]`
        )
        .join(" | ");

      const totalQty = (ord.items || []).reduce((sum, item) => sum + item.quantity, 0);

      rowsXml += `
        <Row ss:StyleID="DataRowStyle">
          <Cell><Data ss:Type="String">${escapeXml(ord.order_number)}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeXml(formattedDate)}</Data></Cell>
          <Cell ss:StyleID="Status_${ord.status}"><Data ss:Type="String">${escapeXml(ord.status.toUpperCase())}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeXml(ord.customer_name)}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeXml(ord.customer_email)}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeXml(ord.customer_phone || "N/A")}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeXml(ord.shipping_address?.address || "N/A")}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeXml(ord.shipping_address?.city || "N/A")}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeXml(ord.shipping_address?.postalCode || "N/A")}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeXml(itemsSummary || "N/A")}</Data></Cell>
          <Cell><Data ss:Type="Number">${totalQty}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeXml(ord.payment_method || "COD")}</Data></Cell>
          <Cell ss:StyleID="CurrencyStyle"><Data ss:Type="Number">${ord.total_amount}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeXml(ord.courier_name || "Blue Dart Express")}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeXml(ord.tracking_number || "Pending Dispatch")}</Data></Cell>
        </Row>
      `;
    });
  }

  return `
    <Worksheet ss:Name="${escapeXml(sheetName)}">
      <Table ss:DefaultColumnWidth="120">
        <Column ss:Width="110" />
        <Column ss:Width="130" />
        <Column ss:Width="90" />
        <Column ss:Width="140" />
        <Column ss:Width="160" />
        <Column ss:Width="100" />
        <Column ss:Width="200" />
        <Column ss:Width="100" />
        <Column ss:Width="80" />
        <Column ss:Width="300" />
        <Column ss:Width="90" />
        <Column ss:Width="110" />
        <Column ss:Width="120" />
        <Column ss:Width="130" />
        <Column ss:Width="140" />
        ${rowsXml}
      </Table>
    </Worksheet>
  `;
}

/**
 * Downloads a complete multi-sheet Excel file (.xls) organized by order statuses.
 */
export function exportOrdersToExcel(orders: ExportOrderItem[], filenamePrefix = "NOIR_Orders_Report") {
  const deliveredOrders = orders.filter((o) => o.status === "delivered");
  const cancelledOrders = orders.filter((o) => o.status === "cancelled");
  const pendingOrders = orders.filter((o) => o.status === "pending");
  const processingOrders = orders.filter((o) => o.status === "processing");
  const shippedOrders = orders.filter((o) => o.status === "shipped");
  const confirmedOrders = orders.filter((o) => o.status === "confirmed");

  const xmlContent = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
    <Title>NOIR Order Management Report</Title>
    <Author>NOIR Atelier Admin</Author>
    <Created>${new Date().toISOString()}</Created>
    <Company>NOIR Luxury Atelier</Company>
  </DocumentProperties>
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center" />
      <Borders />
      <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000" />
      <Interior />
      <NumberFormat />
      <Protection />
    </Style>
    <Style ss:ID="HeaderStyle">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" />
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C5A46D" />
      </Borders>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1" />
      <Interior ss:Color="#141414" ss:Pattern="Solid" />
    </Style>
    <Style ss:ID="DataRowStyle">
      <Alignment ss:Vertical="Center" />
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E5E5" />
      </Borders>
      <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#262626" />
    </Style>
    <Style ss:ID="CurrencyStyle">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center" />
      <NumberFormat ss:Format="₹#,##0" />
      <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#141414" ss:Bold="1" />
    </Style>
    <Style ss:ID="Status_delivered">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" />
      <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#047857" ss:Bold="1" />
      <Interior ss:Color="#ECFDF5" ss:Pattern="Solid" />
    </Style>
    <Style ss:ID="Status_cancelled">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" />
      <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#B91C1C" ss:Bold="1" />
      <Interior ss:Color="#FEF2F2" ss:Pattern="Solid" />
    </Style>
    <Style ss:ID="Status_pending">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" />
      <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#B45309" ss:Bold="1" />
      <Interior ss:Color="#FFFBEB" ss:Pattern="Solid" />
    </Style>
    <Style ss:ID="Status_processing">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" />
      <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#1D4ED8" ss:Bold="1" />
      <Interior ss:Color="#EFF6FF" ss:Pattern="Solid" />
    </Style>
    <Style ss:ID="Status_shipped">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" />
      <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#0E7490" ss:Bold="1" />
      <Interior ss:Color="#ECFEFF" ss:Pattern="Solid" />
    </Style>
    <Style ss:ID="Status_confirmed">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" />
      <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#7C3AED" ss:Bold="1" />
      <Interior ss:Color="#F5F3FF" ss:Pattern="Solid" />
    </Style>
  </Styles>
  ${generateWorksheetXml("All Orders", orders)}
  ${generateWorksheetXml("Delivered Orders", deliveredOrders)}
  ${generateWorksheetXml("Cancelled Orders", cancelledOrders)}
  ${generateWorksheetXml("Pending Orders", pendingOrders)}
  ${generateWorksheetXml("Processing Orders", processingOrders)}
  ${generateWorksheetXml("Shipped Orders", shippedOrders)}
  ${generateWorksheetXml("Confirmed Orders", confirmedOrders)}
</Workbook>`;

  const blob = new Blob([xmlContent], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateStr = new Date().toISOString().split("T")[0];
  a.href = url;
  a.download = `${filenamePrefix}_${dateStr}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

