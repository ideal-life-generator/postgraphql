import NamedType from './type/NamedType'
import AliasType from './type/AliasType'
import ObjectType from './type/ObjectType'
import Collection from './collection/Collection'
import Relation from './collection/Relation'

// TODO: Validate inventory functions. There are a lot of assumptions we make that
// cannot be statically typed. We should have a test utility function to prove
// those assumptions are correct. We will mostly test things not defined in
// the type system.
// TODO: Is this the right way to do it?
// TODO: Test this!
/**
 * In order to build awesome tools from any database we need an abstract
 * static data definition language. Inventory is the root level interface
 * to this definition.
 *
 * If a database is strongly typed (like PostgreSQL) it may implement the
 * inventory interfaces to expose its underlying data.
 *
 * Believe it or not, a `Inventory` and all of the objects inside it are
 * *mutable*. Scary, I know.
 */
class Inventory {
  private _types = new Map<string, NamedType<mixed>>()
  private _collections = new Map<string, Collection>()
  private _relations = new Map<string, Relation<mixed>>()

  /**
   * Add a type to our inventory. If the type is a composite named type (like an
   * alias type or an object type), we will also add the types it is composed
   * of to the inventory.
   *
   * Type names must be unique. So if you had already added a type with the
   * same name to the inventory, an error will be thrown.
   */
  // TODO: add tests!
  public addType (type: NamedType<mixed>): this {
    // If the type has already been added, we good!
    if (this.hasType(type))
      return this

    const name = type.name

    if (this._types.has(name))
      throw new Error(`Type of name '${name}' already exists in the inventory.`)

    this._types.set(name, type)

    // Add the base type if this is an alias type.
    if (type instanceof AliasType)
      this.addType(type.baseType.getNamedType())

    // Add the type for all of the fields if this is an object type.
    if (type instanceof ObjectType)
      Array.from(type.fields).forEach(([fieldName, { type }]) => this.addType(type.getNamedType()))

    return this
  }

  /**
   * Get all of the types in our inventory.
   */
  public getTypes (): Array<NamedType<mixed>> {
    return Array.from(this._types.values())
  }

  /**
   * Returns true if the exact same type exists in this inventory, false if it
   * doesn’t.
   */
  public hasType (type: NamedType<mixed>): boolean {
    return this._types.get(type.name) === type
  }

  /**
   * Adds a single collection to our inventory. If a collection with the same
   * name already exists, an error is thrown. If the collection has a
   * different inventory, an error is thrown.
   *
   * We will also add the type for this collection to the inventory.
   */
  public addCollection (collection: Collection): this {
    const { name } = collection

    if (this._collections.has(name))
      throw new Error(`Collection of name '${name}' already exists in the inventory.`)

    this._collections.set(name, collection)

    // Add the type for this collection if it exists.
    if (collection.type)
      this.addType(collection.type)

    return this
  }

  /**
   * Gets all of the collections in our system. A collection will always have
   * an object type, which should be accessible through `getTypes`.
   *
   * Two collections in this set should not have the same name.
   */
  // TODO: Test that the collection object type is returned by `getTypes`.
  // TODO: Test that collections do not have the same name.
  public getCollections (): Array<Collection> {
    return Array.from(this._collections.values())
  }

  /**
   * Gets a single collection by name.
   */
  public getCollection (name: string): Collection | undefined {
    return this._collections.get(name)
  }

  /**
   * Determines if a *specific* collection has been added to the inventory. If
   * the exact reference to the collection argument exists in the inventory this
   * method returns true, otherwise it returns false.
   */
  public hasCollection (collection: Collection): boolean {
    return this._collections.get(collection.name) === collection
  }

  /**
   * Adds a single relation to our inventory. If the related collections are not
   * members of this inventory we fail with an error.
   */
  public addRelation (relation: Relation<mixed>): this {
    const { name, tailCollection, headCollection, headCollectionKey } = relation

    if (headCollectionKey && !headCollection.keys.has(headCollectionKey))
      throw new Error(`Head collection key '${headCollectionKey.name}' is not valid for head collection '${headCollection.name}'.`)

    if (!this.hasCollection(tailCollection))
      throw new Error(`Tail collection named '${tailCollection.name}' is not in this inventory.`)

    if (!this.hasCollection(headCollection))
      throw new Error(`Head collection named '${headCollection.name}' is not in this inventory.`)

    if (this._relations.has(name))
      throw new Error(`Relation of name '${name}' already exists in the inventory.`)

    this._relations.set(name, relation)

    return this
  }

  /**
   * Gets all of the relations in our inventory. A relationship is formed when
   * the values of one collection reference another. A relation can be used to
   * track that reference and perform operations using that reference.
   *
   * In a graph representation of our inventory, collections would be nodes and
   * relations would be directed edges.
   */
  public getRelations (): Array<Relation<mixed>> {
    return Array.from(this._relations.values())
  }
}

export default Inventory
