        {/* Tax Invoices Tab */}
        {selectedTab === 'invoices' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>세금계산서 ({taxInvoices.length}건)</CardTitle>
                <p className="text-sm text-gray-500">세금계산서는 1~2일 이내 발행 됩니다.</p>
              </div>
            </CardHeader>
            <CardContent>
              {/* 발행 예정 건 (입금 완료된 충전 신청 중 세금계산서 필요 건) */}
              {chargeRequests.filter(r => (r.status === 'completed' || r.status === 'confirmed') && r.needs_tax_invoice && !r.tax_invoice_issued).length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4">발행 예정 ({chargeRequests.filter(r => (r.status === 'completed' || r.status === 'confirmed') && r.needs_tax_invoice && !r.tax_invoice_issued).length}건)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-4">신청일</th>
                          <th className="text-left p-4">회사명</th>
                          <th className="text-left p-4">금액</th>
                          <th className="text-left p-4">상태</th>
                          <th className="text-left p-4">신청 정보</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chargeRequests.filter(r => (r.status === 'completed' || r.status === 'confirmed') && r.needs_tax_invoice && !r.tax_invoice_issued).map((request) => (
                          <tr key={request.id} className="border-b hover:bg-gray-50">
                            <td className="p-4 text-sm">
                              {new Date(request.created_at).toLocaleDateString('ko-KR')}
                            </td>
                            <td className="p-4 text-sm">
                              {request.tax_invoice_info?.companyName || '-'}
                            </td>
                            <td className="p-4 font-medium">
                              {formatCurrency(request.amount)}
                            </td>
                            <td className="p-4">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                발행 대기
                              </span>
                            </td>
                            <td className="p-4">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedTaxInfo(request.tax_invoice_info)}
                              >
                                <FileText className="w-4 h-4 mr-2" />
                                신청 정보 보기
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 발행 완료 건 */}
              {taxInvoices.length === 0 ? (
                chargeRequests.filter(r => (r.status === 'completed' || r.status === 'confirmed') && r.needs_tax_invoice && !r.tax_invoice_issued).length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    세금계산서 내역이 없습니다
                  </div>
                )
              ) : (
                <div>
                  <h3 className="text-lg font-semibold mb-4">발행 완료 ({taxInvoices.length}건)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-4">발급일</th>
                          <th className="text-left p-4">공급가액</th>
                          <th className="text-left p-4">부가세</th>
                          <th className="text-left p-4">합계</th>
                          <th className="text-left p-4">상태</th>
                          <th className="text-left p-4">다운로드</th>
                        </tr>
                      </thead>
                      <tbody>
                        {taxInvoices.map((invoice) => (
                          <tr key={invoice.id} className="border-b hover:bg-gray-50">
                            <td className="p-4 text-sm">
                              {invoice.issue_date
                                ? new Date(invoice.issue_date).toLocaleDateString('ko-KR')
                                : new Date(invoice.created_at).toLocaleDateString('ko-KR')}
                            </td>
                            <td className="p-4">{formatCurrency(invoice.supply_amount)}</td>
                            <td className="p-4">{formatCurrency(invoice.tax_amount)}</td>
                            <td className="p-4 font-bold">
                              {formatCurrency(invoice.total_amount)}
                            </td>
                            <td className="p-4">{getStatusBadge(invoice.status)}</td>
                            <td className="p-4">
                              {invoice.status === 'issued' && (
                                <Button size="sm" variant="outline">
                                  <Download className="w-4 h-4 mr-2" />
                                  다운로드
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
