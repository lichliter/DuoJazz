//
//  DiscoverViewModel.swift
//  DuoJazz
//

import Foundation

@Observable
class DiscoverViewModel {
    var allCollections: [LickCollection] = BuiltInCollections.all
    var selectedKey: KeyOption = KeyOption.allOptions[0]
}
